..  _known_problems:

==============
Known Problems
==============

Known Issues and Limitations
=============================

This section documents known issues, limitations, and workarounds for the Kanban Workspaces extension.

Current Version Issues
======================

Module Availability
-------------------

**Issue:** The Kanban Workspaces module only appears when in an active workspace.

**Behavior:** The module is hidden when in the Live workspace (TYPO3's main published content).

**Reason:** Kanban boards are designed for workspace content management. Live workspace doesn't have staging, so the kanban board isn't applicable.

**Workaround:** Switch to an active workspace to see the module. Users can change their workspace in:

1. Click their username in top-right corner
2. Select "Switch workspace" or similar option
3. Choose an active workspace (not "Live")

**Status:** Expected behavior (not a bug)

---

**Issue:** Module doesn't appear in Web menu.

**Possible Causes:**

1. Extension not activated
2. User lacks Web module access
3. Backend cache not cleared

**Solutions:**

1. Verify extension is in Extension Manager's "Installed Extensions"
2. Check user backend permissions include Web module access
3. Clear backend caches: Admin Tools > Maintenance > Clear Cache
4. Hard-refresh browser (Ctrl+Shift+R)

---

Empty Kanban Board
-------------------

**Issue:** Kanban board appears but shows no stages or items.

**Possible Causes:**

1. No workspace stages configured
2. No content in selected page tree
3. Page access restrictions prevent item display
4. Wrong depth/language filter selected

**Solutions:**

1. Verify workspace has stages configured: Admin Tools > Workspaces > [Select Workspace] > Stages
2. Ensure selected page has child content items
3. Try depth "Infinite" to see items at all levels
4. Change language filter to "All" to see all language variants
5. Check user has access to pages containing items

---

JavaScript Errors
-----------------

**Issue:** Browser console shows JavaScript errors preventing kanban board interaction.

**Common Errors:**

* "Cannot read property of undefined"
* "Module failed to load"
* "Drag functionality not initialized"

**Solutions:**

1. **Clear browser cache completely:**
   - Press Ctrl+Shift+Del
   - Clear all browsing data
   - Hard-refresh page (Ctrl+Shift+R)

2. **Check browser compatibility:**
   - Use modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
   - Ensure JavaScript is enabled
   - Try different browser to isolate issue

3. **Check TYPO3 cache:**
   - Admin Tools > Maintenance > Flush all caches
   - Then reload kanban board module

4. **Verify extension assets are loaded:**
   - Open browser DevTools (F12)
   - Network tab
   - Check CSS and JS files load with 200 status
   - Check console for loading errors

---

Stage Transitions Not Working
------------------------------

**Issue:** Dragging items between stages doesn't work or shows errors.

**Possible Causes:**

1. User lacks permission to edit items
2. User lacks permission in target stage
3. Workspace doesn't allow stage transitions
4. JavaScript initialization failed

**Solutions:**

1. **Check workspace permissions:**
   - Admin Tools > Workspaces > [Select Workspace]
   - Verify user has edit rights in all stages
   - Verify target stage allows transitions

2. **Check page/item access:**
   - Users can only move items they can edit
   - Verify page access control list allows editing
   - Check field restrictions don't prevent stage field updates

3. **Test with admin user:**
   - If admin can move items but regular user can't, it's a permissions issue
   - Adjust workspace/page/field permissions

4. **Check browser console:**
   - F12 > Console tab
   - Look for error messages
   - Check Network tab for failed API requests

---

Performance Issues
------------------

**Issue:** Kanban board loads slowly or becomes unresponsive with many items.

**Causes:**

1. Large number of items in workspace (hundreds or thousands)
2. Deep page tree being displayed
3. All languages shown at once
4. Insufficient server resources

**Solutions:**

1. **Use depth filter:**
   - Select "This Page" or "1 Level" instead of "Infinite"
   - Reduces displayed items significantly

2. **Filter by language:**
   - Show one language at a time instead of "All"
   - Reduces items by language count factor

3. **Filter by stage:**
   - Show specific stages instead of all stages
   - Helps focus on relevant items

4. **Consider workspace size:**
   - Regularly publish items to keep workspace manageable
   - Split large workspaces if needed
   - Archive completed versions

5. **Server resources:**
   - Check server CPU and memory usage
   - Ensure database has proper indexes
   - Consider database optimization

---

Multi-Language Issues
---------------------

**Issue:** Language filter shows unexpected language combinations.

**Behavior:** Language filter shows all configured site languages, not just active translations.

**Reason:** TYPO3 can have language definitions that don't have actual content.

**Solutions:**

1. Use language filter to show only languages with actual content
2. Verify language configuration in Site Settings
3. Check translation status of pages

---

**Issue:** Items from default language shown even with non-default language selected.

**Reason:** Some TYPO3 pages fallback to default language content if translation doesn't exist.

**Solutions:**

1. Ensure page translations exist before filtering
2. Check fallback language configuration in site settings
3. Create translations for all needed languages

---

Workspace-Related Issues
------------------------

**Issue:** Changes made in kanban board don't save to workspace.

**Possible Causes:**

1. Workspace is in read-only mode
2. User lacks write permissions
3. Database transaction failed
4. Workspace is locked

**Solutions:**

1. Check workspace isn't locked: Admin Tools > Workspaces > [Select Workspace]
2. Verify user has write permissions in workspace
3. Check error logs: var/log/typo3_*.log
4. Try again, errors may be temporary

---

**Issue:** "This workspace is not editable" message appears.

**Cause:** Workspace may be archived or in a read-only state.

**Solutions:**

1. Create a new active workspace
2. Use Live workspace temporarily if needed
3. Contact administrator to unarchive workspace

---

Browser-Specific Issues
-----------------------

**Safari Issues**

* Drag-and-drop may not work smoothly
* **Solution:** Ensure Safari is up to date (14.1+)
* Consider using Chrome for better compatibility

**Firefox Issues**

* Occasional JavaScript module loading delays
* **Solution:** Clear browser cache, hard-refresh page

**Internet Explorer 11**

* **Status:** Not supported (requires modern browsers)
* **Solution:** Use Chrome, Firefox, Safari, or Edge instead

---

Display Issues
--------------

**Issue:** Kanban board layout looks broken or columns are misaligned.

**Causes:**

1. CSS not loaded properly
2. Browser zoom level interfering
3. Very narrow screen (mobile/tablet)
4. Custom CSS conflicting

**Solutions:**

1. **Check CSS loading:**
   - F12 > Network tab
   - Verify Styles.css and Fontawesome.min.css load with 200 status
   - Check console for CSS parsing errors

2. **Reset browser zoom:**
   - Ctrl+0 (zero) to reset zoom to 100%
   - Try different zoom level

3. **Use wider screen:**
   - Tablet width may not accommodate all columns
   - Desktop width recommended
   - Check responsive view in DevTools

4. **Check custom CSS:**
   - Disable browser extensions affecting page styling
   - Clear browser cache completely

---

Third-Party Integration Issues
===============================

Conflicts with Other Extensions
--------------------------------

**Extensions Known to Have Issues:**

Currently, no known critical conflicts are documented. If you encounter conflicts:

1. Note which extension causes the conflict
2. Report to extension author
3. Use workarounds until fixed
4. Check extension release notes

**Potential Conflict Sources:**

* Custom workspace extensions
* Custom page tree modifications
* Backend UI customization extensions
* JavaScript library conflicts

**Solutions:**

1. Check for JavaScript console errors when conflicting extension is enabled
2. Disable conflicting extension if not critical
3. Contact extension authors about compatibility

---

Workflow Issues
===============

Stage Configuration Problems
----------------------------

**Issue:** Custom stages don't appear in kanban board.

**Solutions:**

1. Verify stages are configured in workspace: Admin Tools > Workspaces > Stages
2. Clear TYPO3 caches
3. Refresh kanban board module
4. Check user has access to all stages

---

**Issue:** Only the default stage appears; custom stages missing.

**Check:**

1. Are custom stages actually configured in the workspace?
2. Do you have view permissions for custom stages?

---

Access Control Issues
---------------------

**Issue:** "Access Denied" when trying to edit items.

**Causes:**

1. Missing workspace edit permission
2. Missing page edit permission
3. Missing field edit restriction
4. Page is locked by another user

**Solutions:**

1. Ask administrator to grant workspace edit rights
2. Ask page owner to grant edit access
3. Check field-level permissions (Admin Tools > User TSconfig)
4. Wait for other user to release page lock, or have admin break lock

---

Database and Backend Issues
=============================

Database Synchronization Issues
--------------------------------

**Issue:** Database shows changes not reflected in kanban board.

**Solution:**

1. Clear all caches: Admin Tools > Maintenance > Flush Cache
2. Reload kanban board page
3. Database should synchronize automatically

---

API/Integration Issues
----------------------

**Issue:** Custom code integrating with kanban extension fails.

**Debug Steps:**

1. Check extension documentation for API changes
2. Verify code uses correct namespaces and class names
3. Test with vanilla installation to isolate issue
4. Check error logs: var/log/typo3_*.log

---

Limitations and Design Constraints
===================================

Current Design Limitations
---------------------------

1. **Single Page Context:** Each kanban board view shows one page tree root. Multiple workspaces require separate module instances.

2. **Synchronous Updates:** Stage transitions are synchronous. Large database updates may cause temporary UI freeze.

3. **Language Structure:** Language filtering is based on TYPO3 site language configuration, not arbitrary tag-based filtering.

4. **Stage Permissions:** Respects workspace stage permissions exactly as configured. Fine-grained field-level permissions may limit stage transitions.

5. **Depth Limitations:** Maximum practical depth is ~4-5 levels. Beyond that, performance degrades significantly.

6. **Browser Compatibility:** Requires modern browsers with ES6+ support. Legacy browsers not supported.

---

Feature Limitations
-------------------

**Not Currently Supported:**

* Bulk stage transitions (single-click to move multiple items)
* Custom item properties display on cards
* Item color coding based on custom rules
* Kanban board persistence (selected filters reset on page reload)
* Mobile-optimized interface (desktop-only currently)

---

Future Improvements
===================

Planned Features (Not Yet Implemented)
--------------------------------------

* Persistent filter selections (saved per user)
* Bulk operations on multiple items
* Custom kanban card templates
* Item relationship visualization
* Performance improvements for very large workspaces
* Mobile interface optimization

---

Reporting Issues
================

How to Report Bugs
------------------

If you encounter issues not listed here:

1. **Gather Information:**
   - TYPO3 version
   - PHP version
   - Browser and version
   - Exact steps to reproduce
   - Error messages and logs

2. **Check Existing Issues:**
   - GitHub repository for known issues
   - Extension documentation for workarounds

3. **Report to Developer:**
   - WebVision issue tracker
   - Include reproduction steps
   - Attach relevant error logs
   - Describe expected vs. actual behavior

4. **Include Debug Information:**
   - Browser console screenshots
   - TYPO3 error logs (var/log/)
   - Extension configuration screenshot
   - Workspace configuration details

---

Getting Help
============

Resources for Assistance
------------------------

1. **Extension Documentation** - This guide and configuration docs
2. **TYPO3 Community Forum** - TYPO3 general questions and workspace info
3. **Developer Documentation** - For custom implementations
4. **Administrator Documentation** - For setup and configuration
5. **Extension Author** - WebVision GmbH for extension-specific issues

Support Contacts
----------------

* **Extension Issues:** WebVision GitHub/Issue Tracker
* **TYPO3 General:** https://typo3.org/community/
* **Documentation:** This documentation set

