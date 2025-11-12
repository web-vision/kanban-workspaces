/**
 * Test file to verify TYPO3 workspace API response handling
 * This can be run in the browser console to test the transformation logic
 */

// Sample API response from TYPO3 workspace dispatch
const sampleApiResponse = [
  {
    "action": "RemoteServer",
    "method": "getWorkspaceInfos",
    "result": {
      "total": 3,
      "data": [
        {
          "Workspaces_Collection": 0,
          "Workspaces_CollectionLevel": 0,
          "Workspaces_CollectionParent": "",
          "Workspaces_CollectionCurrent": "",
          "Workspaces_CollectionChildren": 0,
          "table": "pages",
          "id": "pages:2",
          "uid": 2,
          "label_Workspace": "Home: Kanban Workspaces",
          "label_Stage": "Editing",
          "value_nextStage": 1,
          "value_prevStage": 0,
          "path_Workspace": "/",
          "lastChangedFormatted": "2025-11-01 12:13",
          "t3ver_wsid": 1,
          "t3ver_oid": 1,
          "livepid": 0,
          "stage": 0,
          "icon_Workspace": "apps-pagetree-page-domain",
          "icon_Workspace_Overlay": "",
          "language": {
            "icon": "empty-empty",
            "title": "Default",
            "title_crop": "Default"
          },
          "allowedAction_publish": true,
          "allowedAction_delete": true,
          "allowedAction_view": true,
          "allowedAction_edit": true,
          "allowedAction_versionPageOpen": true,
          "state_Workspace": "modified",
          "hasChanges": true,
          "urlToPage": "/typo3/module/manage/workspaces?token=fec383fc559702bea9ffa73e6d51ec3fb6bd76f8&workspace=1&id=0",
          "expanded": false,
          "integrity": {
            "status": "success",
            "messages": ""
          }
        },
        {
          "Workspaces_Collection": 0,
          "Workspaces_CollectionLevel": 0,
          "Workspaces_CollectionParent": "",
          "Workspaces_CollectionCurrent": "",
          "Workspaces_CollectionChildren": 0,
          "table": "pages",
          "id": "pages:3",
          "uid": 3,
          "label_Workspace": "Test Board",
          "label_Stage": "Editing",
          "value_nextStage": 1,
          "value_prevStage": 0,
          "path_Workspace": "/Home: Kanban Workspaces/",
          "lastChangedFormatted": "2025-11-01 12:14",
          "t3ver_wsid": 1,
          "t3ver_oid": 3,
          "livepid": 1,
          "stage": 0,
          "icon_Workspace": "apps-pagetree-page-default",
          "icon_Workspace_Overlay": "",
          "language": {
            "icon": "empty-empty",
            "title": "Default",
            "title_crop": "Default"
          },
          "allowedAction_publish": true,
          "allowedAction_delete": true,
          "allowedAction_view": true,
          "allowedAction_edit": true,
          "allowedAction_versionPageOpen": true,
          "state_Workspace": "new",
          "hasChanges": true,
          "urlToPage": "/typo3/module/manage/workspaces?token=fec383fc559702bea9ffa73e6d51ec3fb6bd76f8&workspace=1&id=1",
          "expanded": false,
          "integrity": {
            "status": "success",
            "messages": ""
          }
        },
        {
          "Workspaces_Collection": 0,
          "Workspaces_CollectionLevel": 0,
          "Workspaces_CollectionParent": "",
          "Workspaces_CollectionCurrent": "",
          "Workspaces_CollectionChildren": 0,
          "table": "tt_content",
          "id": "tt_content:1",
          "uid": 1,
          "label_Workspace": "Hello",
          "label_Stage": "Editing",
          "value_nextStage": 1,
          "value_prevStage": 0,
          "path_Workspace": "/Home: Kanban Workspaces/",
          "lastChangedFormatted": "2025-10-31 19:18",
          "t3ver_wsid": 1,
          "t3ver_oid": 1,
          "livepid": 1,
          "stage": 0,
          "icon_Workspace": "mimetypes-x-content-header",
          "icon_Workspace_Overlay": "",
          "language": {
            "icon": "empty-empty",
            "title": "Default",
            "title_crop": "Default"
          },
          "allowedAction_publish": true,
          "allowedAction_delete": true,
          "allowedAction_view": true,
          "allowedAction_edit": true,
          "allowedAction_versionPageOpen": true,
          "state_Workspace": "new",
          "hasChanges": true,
          "urlToPage": "/typo3/module/manage/workspaces?token=fec383fc559702bea9ffa73e6d51ec3fb6bd76f8&workspace=1&id=1",
          "expanded": false,
          "integrity": {
            "status": "success",
            "messages": ""
          }
        }
      ]
    }
  }
];

// Test function to verify API response handling
function testAPIResponseTransformation() {
  console.log("=== TESTING TYPO3 WORKSPACE API RESPONSE TRANSFORMATION ===");
  
  if (typeof window.workspaceBoard === 'undefined') {
    console.error("WorkspaceBoard not available. Please ensure the kanban board is initialized.");
    return;
  }
  
  console.log("1. Testing stage extraction...");
  const extractedStages = window.workspaceBoard.extractStagesFromWorkspaceInfo(sampleApiResponse);
  console.log("Extracted stages:", extractedStages);
  
  console.log("\n2. Testing data transformation...");
  const transformedData = window.workspaceBoard.transformWorkspaceData(sampleApiResponse);
  console.log("Transformed data:", transformedData);
  
  console.log("\n3. Expected cards:");
  transformedData.cards.forEach((card, index) => {
    console.log(`Card ${index + 1}:`, {
      id: card.id,
      title: card.title,
      type: card.type,
      table: card.table,
      stage: card.stage,
      stageTitle: card.stageTitle,
      state: card.state,
      allowedActions: card.allowedActions
    });
  });
  
  console.log("\n4. Stage workflow:");
  extractedStages.forEach((stage, index) => {
    console.log(`${index + 1}. ${stage.label} (ID: ${stage.id}, TYPO3 ID: ${stage.stage_id}, Color: ${stage.color})`);
  });
  
  return {
    stages: extractedStages,
    cards: transformedData.cards
  };
}

// Test function for specific API response scenarios
function testEdgeCases() {
  console.log("=== TESTING EDGE CASES ===");
  
  // Test empty response
  console.log("1. Testing empty response...");
  const emptyResult = window.workspaceBoard.transformWorkspaceData([]);
  console.log("Empty response result:", emptyResult);
  
  // Test malformed response
  console.log("2. Testing malformed response...");
  const malformedResult = window.workspaceBoard.transformWorkspaceData([{ invalid: "data" }]);
  console.log("Malformed response result:", malformedResult);
  
  // Test response with different stage IDs
  console.log("3. Testing response with different stage IDs...");
  const customStageResponse = [
    {
      "action": "RemoteServer",
      "method": "getWorkspaceInfos",
      "result": {
        "total": 2,
        "data": [
          {
            "table": "pages",
            "id": "pages:10",
            "uid": 10,
            "label_Workspace": "Test Page in Review",
            "label_Stage": "Review",
            "value_nextStage": -10,
            "value_prevStage": 0,
            "stage": 1,
            "state_Workspace": "modified",
            "language": { "title": "Default" }
          },
          {
            "table": "pages", 
            "id": "pages:11",
            "uid": 11,
            "label_Workspace": "Ready to Publish Page",
            "label_Stage": "Ready to publish",
            "value_nextStage": -20,
            "value_prevStage": 1,
            "stage": -10,
            "state_Workspace": "modified",
            "language": { "title": "Default" }
          }
        ]
      }
    }
  ];
  
  const customResult = window.workspaceBoard.transformWorkspaceData(customStageResponse);
  console.log("Custom stage response result:", customResult);
  
  return {
    empty: emptyResult,
    malformed: malformedResult,
    custom: customResult
  };
}

// Export for use in browser console
window.testAPIResponseTransformation = testAPIResponseTransformation;
window.testEdgeCases = testEdgeCases;
window.sampleApiResponse = sampleApiResponse;

console.log("API response test functions loaded. Run:");
console.log("- testAPIResponseTransformation() - Test main transformation");
console.log("- testEdgeCases() - Test edge cases");
