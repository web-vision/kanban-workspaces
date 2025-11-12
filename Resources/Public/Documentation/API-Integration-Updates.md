# TYPO3 Kanban Workspaces - API Integration Updates

## Overview
This document outlines the updates made to integrate the TYPO3 Kanban Workspaces with real TYPO3 workspace API responses.

## Changes Made

### 1. Updated fetchData Method (`Workspace.js`)
**File**: `/packages/kanban_workspaces/Resources/Public/JavaScript/Workspace.js`

**Changes**:
- Updated payload format to match TYPO3 expectations:
  - `depth: "1"` (string format instead of integer)
  - `stage: "-99"` (string format instead of integer)
  - `limit: 30` (reduced from 100 to match TYPO3 default)

**API Endpoint**: `ajax/workspace/dispatch`

**Payload**:
```json
{
    "action": "RemoteServer",
    "method": "getWorkspaceInfos",
    "data": [
        {
            "id": 1,
            "depth": "1",
            "language": "all",
            "limit": 30,
            "query": "",
            "start": 0,
            "filterTxt": "",
            "stage": "-99"
        }
    ]
}
```

### 2. Enhanced transformWorkspaceData Method
**Location**: `Workspace.js` lines ~867-947

**Key Features**:
- Handles nested API response structure (`apiResponse[0].result.data`)
- Maps TYPO3 workspace items to kanban cards
- Extracts comprehensive metadata from TYPO3 response
- Supports both pages and content elements (`tt_content`)

**Card Properties Mapped**:
- `id`: TYPO3 composite ID (e.g., "pages:2", "tt_content:1")
- `title`: `label_Workspace`
- `type`: Derived from `table` field
- `stage`: Mapped from TYPO3 `stage` ID to kanban stage
- `state`: `state_Workspace` (modified/new)
- `allowedActions`: Permission flags for publish/delete/edit/view
- `language`: Language information with icon
- `workspaceId`: `t3ver_wsid`

### 3. Improved Stage Detection Logic
**Location**: `Workspace.js` lines ~629-745

**Features**:
- Analyzes workspace data to discover available stages
- Extracts stage labels from `label_Stage` field
- Maps `value_nextStage` to understand workflow
- Creates logical stage ordering: Editing → Review → Ready → Published
- Handles dynamic stage creation based on actual TYPO3 configuration

**Stage Mapping**:
```javascript
0: "Editing" (draft)
1: "Review" (review) 
-10: "Ready to publish" (ready)
-20: "Published" (published)
```

### 4. Updated App.js Debug Functions
**File**: `/packages/kanban_workspaces/Resources/Public/JavaScript/App.js`

**New Functions**:
- `testRealApiResponse()`: Tests with actual TYPO3 API response data
- `loadApiTests()`: Loads additional testing utilities

### 5. Created Test Utilities
**File**: `/packages/kanban_workspaces/Resources/Public/JavaScript/test-api-response.js`

**Functions**:
- `testAPIResponseTransformation()`: Validates transformation logic
- `testEdgeCases()`: Tests error handling scenarios
- Sample API response data for testing

## API Response Structure

### Expected TYPO3 Response Format
```json
[
    {
        "action": "RemoteServer",
        "method": "getWorkspaceInfos",
        "result": {
            "total": 3,
            "data": [
                {
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
                    "stage": 0,
                    "icon_Workspace": "apps-pagetree-page-domain",
                    "language": {
                        "icon": "empty-empty",
                        "title": "Default"
                    },
                    "allowedAction_publish": true,
                    "allowedAction_delete": true,
                    "state_Workspace": "modified",
                    "hasChanges": true
                }
            ]
        }
    }
]
```

## Testing

### Browser Console Commands
After initializing the kanban board, run:

```javascript
// Test workspace API integration
testWorkspaceAPI()

// Test with real API response data
testRealApiResponse()

// Test stage detection
testWorkspaceStages()

// Load additional test functions
loadApiTests()
testAPIResponseTransformation()
testEdgeCases()

// Reload data from API
reloadWorkspaceData()
```

### Expected Behavior
1. **Stage Detection**: Should detect "Editing" stage from sample data and create workflow
2. **Card Creation**: Should create 3 cards from sample response (2 pages, 1 content element)
3. **Stage Mapping**: All items in sample are stage 0 ("Editing")
4. **Metadata**: Should preserve TYPO3 metadata (permissions, state, language)

## Error Handling
- Graceful fallback to mock data if API fails
- Validation of API response structure
- Default stage creation if no stages detected
- Toast notifications for API errors

## Compatibility Notes
- Works with TYPO3 v11+ workspace system
- Requires `EXT:workspaces` to be installed
- Uses standard TYPO3 Ajax endpoints
- Respects TYPO3 permissions and tokens

## Next Steps
1. Test with live TYPO3 installation
2. Verify drag-and-drop stage changes call correct TYPO3 APIs
3. Implement publish/delete actions via TYPO3 APIs
4. Add support for workspace switching
5. Enhance error handling and user feedback