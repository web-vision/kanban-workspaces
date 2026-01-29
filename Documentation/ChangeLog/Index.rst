.. include:: /Includes.rst.txt

=========
ChangeLog
=========

Version 1.0.0 (2025-01-29)
==========================

**Initial Release**

This is the first stable release of the Kanban Workspaces extension for TYPO3.

New Features
------------

* **Kanban Board Interface** - Visual drag-and-drop interface for workspace stage management
* **Multi-stage Workflow Support** - Support for custom workspace stages with drag-and-drop transitions
* **Depth-based Content Filtering** - Filter displayed content by page tree depth (0-4 levels or infinite)
* **Multi-language Support** - Filter content by system languages (all languages, specific languages)
* **Stage-based Filtering** - Show items from specific workflow stages
* **Backend Module Integration** - Integrated into TYPO3 Web module with proper navigation
* **Dynamic Stage Configuration** - Auto-configuration from workspace settings
* **Configurable Default Stages** - Option to disable default TYPO3 stages (stage 0)
* **Custom Default Stage** - Set which stage new records are assigned to
* **Event Listener Support** - AfterDataGeneratedForWorkspaceEvent listener for stage management
* **TYPO3 v13 Compatibility** - Full support for TYPO3 v13.4.0+ LTS
* **Persistent Filter State Per User** - User filter preferences are automatically saved and restored on subsequent visits
* **Bulk Stage Transitions** - Drag-and-drop functionality for moving multiple items between workflow stages simultaneously

Technical Details
-----------------

* **Framework:** TYPO3 v13.4.0+
* **PHP:** PHP 8.2.0+
* **Architecture:** Modern TYPO3 service container, dependency injection
* **Code Quality:** PSR-12 compliant, full type declarations, TYPO3 coding standards
* **Documentation:** Comprehensive documentation for administrators, editors, and developers

Installation & Setup
--------------------

* Composer-based installation via ``webvision/kanban-workspaces``
* Automatic backend module registration
* Zero-configuration default setup
* Optional Extension Manager settings for customization

Backend Module Features
-----------------------

* Located at: Web > Kanban Workspaces
* Available to all workspace-enabled backend users
* Supports multiple workspaces simultaneously
* Respects TYPO3 access control and workspace permissions
* Responsive stage display with color coding
* Filter controls for depth, language, and stage
* Automatic asset loading (CSS, JavaScript modules)

JavaScript Module System
------------------------

* Uses TYPO3's modern ES6 module system
* Loads main app module: ``@webvision/kanban-workspaces/App.js``
* Integrates with TYPO3 workspaces send-to-stage functionality
* Asynchronous module loading for optimal performance

Performance Optimizations
-------------------------

* Efficient database queries through TYPO3 repositories
* Lazy loading of workspace data
* Client-side filtering for quick response
* Respects workspace context automatically
* Optimized asset loading strategy

Workspace Integration
---------------------

* Full integration with TYPO3 core workspaces
* Supports all workspace stages and transitions
* Respects workspace edit/delete permissions per stage
* Automatic stage configuration from workspace settings
* Event listener for stage assignment on record generation

Documentation
-------------

* **Administrator Guide** - Installation, configuration, access control, troubleshooting
* **Editor Guide** - Using the kanban board, workflow management, best practices
* **Developer Guide** - Architecture, API reference, extending the extension
* **Configuration Guide** - All configuration options, TypoScript, service configuration
* **Known Problems** - Known issues, limitations, workarounds, reporting bugs

Known Limitations
-----------------

* Module only visible in active workspaces (not in Live workspace)
* Requires modern browser with ES6+ support (IE11 not supported)
* Maximum practical depth of ~4-5 levels for optimal performance
* Desktop-optimized interface (mobile support planned)
* Respects TYPO3 core workspace limitations

Supported Versions
------------------

* TYPO3: 13.4.0 to 13.4.99 (v13 LTS)
* PHP: 8.2.0 to 8.3.99
* Browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

Future Roadmap
==============

Planned Enhancements for Future Versions
-----------------------------------------

**v1.1.0 (Upcoming)**

* Custom kanban card templates
* Enhanced performance monitoring
* Additional language translations

**v1.2.0 (Planned)**

* Mobile interface optimization
* Item relationship visualization
* Advanced filtering options
* Custom stage color configuration in UI
* Workspace analytics and reporting

**v2.0.0 (Future)**

* Major UI redesign
* Advanced workflow automation
* Integration with external systems
* Custom extension hooks
* Enhanced accessibility features

Version Management
==================

Breaking Changes Policy
-----------------------

The extension follows semantic versioning:

* **Major versions (1.0, 2.0, etc.)** - May include breaking changes
* **Minor versions (1.1, 1.2, etc.)** - Backward compatible new features
* **Patch versions (1.0.1, 1.0.2, etc.)** - Bug fixes only, fully compatible

Deprecation Notices
-------------------

None in v1.0.0. All features are stable and recommended for use.

Support Lifespan
----------------

* **v1.x** - Supported until v2.0 release
* **Bug fixes** - Provided for critical issues
* **Security** - Security updates provided as needed
* **Feature requests** - Considered for minor version updates

Migration and Upgrade Notes
============================

For Users Coming from Previous Extensions
------------------------------------------

If migrating from other workspace/kanban extensions:

1. Backup your TYPO3 database
2. Install kanban-workspaces via Composer
3. Clear all caches
4. Test in development environment first
5. Compare workspace configurations to ensure compatibility
6. Deploy to production after thorough testing

Updating from 1.0.0 to Later Versions
--------------------------------------

* Check release notes for breaking changes
* Update via Composer: ``composer update webvision/kanban-workspaces``
* Run database migrations if required: ``vendor/bin/typo3 database:updateschema``
* Clear caches: ``vendor/bin/typo3 cache:flush``
* Test functionality before deploying to production

Changelog Entry Format
======================

This changelog follows the "Keep a Changelog" format:

* **Added** - New features
* **Changed** - Changes in existing functionality
* **Deprecated** - Soon-to-be removed features
* **Removed** - Now removed features
* **Fixed** - Bug fixes
* **Security** - Security vulnerability fixes

Contributors
=============

* **WebVision GmbH** - Primary development and maintenance
* **TYPO3 Community** - Feedback and testing support

Credits and Acknowledgments
===========================

This extension was developed with modern TYPO3 v13 best practices and benefits from:

* **TYPO3 Core Team** - Workspace functionality and core APIs
* **TYPO3 Community** - Testing, feedback, and use case examples
* **Modern JavaScript Standards** - ES6+ modules and patterns

Additional Resources
====================

* **Repository** - GitHub: webvision/kanban-workspaces
* **Issue Tracker** - GitHub Issues for bug reports
* **Documentation** - This comprehensive documentation
* **TYPO3 Docs** - https://docs.typo3.org/

End of Changelog
================

For detailed release history, visit the project repository.

Last Updated: 2025-01-29
Documentation Version: 1.0.0
