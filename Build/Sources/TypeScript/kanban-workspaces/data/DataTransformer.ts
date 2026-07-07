import { convertWorkspaceDate, extractPageNameFromPath } from '@web-vision/kanban-workspaces/core/utils.js';

/**
 * Converts raw TYPO3 workspace API payloads into the card / comment / history /
 * diff shapes consumed by the board UI. Stateless: every method is a pure
 * transform of its input.
 */
export class DataTransformer {
  convertWorkspaceDataToCards(apiResponse) {
    if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
      return [];
    }

    const result = apiResponse[0];
    if (!result || !result.result || !result.result.data) {
      return [];
    }

    const workspaceData = result.result.data;

    return workspaceData.map((item, index) => {

      // Map table type to content type
      const typeMapping = {
        'pages': 'page',
        'tt_content': 'content',
      };

      // Extract editor name from various possible sources
      let editor = '';
      if (item.cruser_id || item.tstamp_user) {
        // In real implementation, you'd fetch user data
        editor = `User ${item.cruser_id || item.tstamp_user}`;
      }

      // Determine priority based on state or other factors
      let priority = 'medium';
      if (item.state_Workspace === 'new') {
        priority = 'high';
      } else if (item.state_Workspace === 'modified') {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Process integrity data from TYPO3 Workspaces IntegrityService
      const integrity = item.integrity || { status: 'success', messages: '' };

      // Adjust priority based on integrity status
      let adjustedPriority = priority;
      if (integrity.status === 'error') {
        adjustedPriority = 'critical'; // New priority level for blocking issues
      } else if (integrity.status === 'warning' && priority !== 'high') {
        adjustedPriority = 'high'; // Elevate to high if not already
      }

      // Create the card object
      return {
        id: item.id || `${item.table}_${item.uid}`,
        title: item.label_Workspace || `${item.table} record ${item.uid}`,
        type: typeMapping[item.table] || 'content',
        uid: item.uid,
        pageName: extractPageNameFromPath(item.path_Workspace) || 'Home',
        editor: editor,
        editorId: `user_${item.cruser_id || item.uid}`,
        modifiedDate: convertWorkspaceDate(item.lastChangedFormatted),
        stage: item.stage || 0,
        language: item.language || { icon: '', title: 'Default', title_crop: 'Default' },
        languageCode: item.language ? item.language.title_crop.toLowerCase().substring(0, 2) : 'en',
        priority: adjustedPriority,
        originalPriority: priority, // Preserve original priority for reference
        integrityStatus: integrity.status,
        integrityMessages: integrity.messages,
        hasSchedule: false, // TYPO3 workspace doesn't have built-in scheduling
        scheduleText: item.stage === -10 ? 'Published' : null,
        comments: 0, // Would need separate API call to get comments
        assignedUsers: item.assignee_uid ? [{ uid: item.assignee_uid, username: item.assignee_username || '', avatar_url: item.assignee_avatar_url || null }] : [],
        assignee: item.assignee_uid ? { uid: item.assignee_uid, username: item.assignee_username || '', avatar_url: item.assignee_avatar_url || null } : null,
        t3ver_oid: item.t3ver_oid || null,
        t3ver_wsid: item.t3ver_wsid || null,
        table: item.table,
        pid: item.livepid || null,
        nextStage: item.value_nextStage,
        prevStage: item.value_prevStage
      };
    });
  }

  // Convert TYPO3 API response to the format used by the modal tabs.
  convertCardDetailsToFormat(apiResponse, cardId) {
    if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
      return { comments: [], history: [], diff: [] };
    }

    const result = apiResponse[0];
    if (!result || !result.result || !result.result.data || !result.result.data[0]) {
      return { comments: [], history: [], diff: [] };
    }

    const data = result.result.data[0];

    // Transform comments
    const comments = this.transformCommentsFromAPI(data.comments || []);

    // Transform history
    const history = this.transformHistoryFromAPI(data.history || {});

    // Extract diff data (already in HTML format from TYPO3)
    const diff = data.diff || [];

    return { comments, history, diff };
  }

  // Transform comments from TYPO3 API format to the UI format.
  transformCommentsFromAPI(apiComments) {
    if (!Array.isArray(apiComments) || apiComments.length === 0) {
      return [];
    }

    return apiComments.map((comment, index) => {
      // Extract avatar from HTML or use username
      const avatarMatch = comment.user_avatar?.match(/src="([^"]+)"/);
      const avatarUrl = avatarMatch ? avatarMatch[1] : null;

      // Build content: show user comment if exists, otherwise show stage movement
      let content = '';
      if (comment.user_comment && comment.user_comment.trim() !== '') {
        content = comment.user_comment;
      } else {
        // Show stage movement without comment
        content = `Moved from "${comment.previous_stage_title}" to "${comment.stage_title}"`;
      }

      return {
        id: `c${index + 1}`,
        author: comment.user_username || 'Unknown User',
        timestamp: convertWorkspaceDate(comment.tstamp),
        content: content,
        avatar: avatarUrl,
        stageTitle: comment.stage_title,
        previousStageTitle: comment.previous_stage_title
      };
    });
  }

  // Transform history from TYPO3 API format to the UI format.
  transformHistoryFromAPI(apiHistory) {
    if (!apiHistory || !apiHistory.data || !Array.isArray(apiHistory.data)) {
      return [];
    }

    return apiHistory.data.map((item, index) => {
      let action = '';

      // Extract avatar from HTML or use null
      const avatarMatch = item.user_avatar?.match(/src="([^"]+)"/);
      const avatarUrl = avatarMatch ? avatarMatch[1] : null;

      // Determine action based on differences
      if (item.differences === 'insert') {
        action = 'Created card';
      } else if (Array.isArray(item.differences) && item.differences.length > 0) {
        const fields = item.differences.map(d => d.label).join(', ');
        action = `Modified: ${fields}`;
      } else {
        action = 'Updated card';
      }

      return {
        id: `h${index + 1}`,
        action: action,
        author: item.user || 'Unknown User',
        timestamp: convertWorkspaceDate(item.datetime),
        avatar: avatarUrl,
        differences: item.differences
      };
    });
  }
}
