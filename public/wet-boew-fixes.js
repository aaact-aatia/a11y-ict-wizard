/**
 * WET-BOEW Accessibility Fixes
 *
 * This script fixes ARIA/HTML validation issues in WET-BOEW tab components:
 * 1. Moves role="tabpanel" from <details> to .tgl-panel
 * 2. Removes invalid ARIA attributes from <summary> elements
 * 3. Cleans up redundant ARIA attributes from <details> elements
 */

(function() {
    'use strict';

    function fixTabMarkup() {
        // Find all WET-BOEW tab containers
        const tabContainers = document.querySelectorAll('.wb-tabs');

        tabContainers.forEach((container) => {
            // Fix the tablist - remove unnecessary aria-hidden="false"
            const tablist = container.querySelector('[role="tablist"]');
            if (tablist && tablist.getAttribute('aria-hidden') === 'false') {
                tablist.removeAttribute('aria-hidden');
            }

            // Find ALL details in wb-tabs containers
            const allDetailsInContainer = container.querySelectorAll('details');

            allDetailsInContainer.forEach((detail) => {
                // Apply our fixes
                const tglPanel = detail.querySelector('.tgl-panel');
                if (tglPanel) {
                    // Move role="tabpanel" to .tgl-panel
                    tglPanel.setAttribute('role', 'tabpanel');

                    // Transfer aria-labelledby to .tgl-panel if it exists
                    const labelledBy = detail.getAttribute('aria-labelledby');
                    if (labelledBy) {
                        tglPanel.setAttribute('aria-labelledby', labelledBy);
                    }

                    // Remove ARIA attributes from details - let it be native HTML
                    detail.removeAttribute('role');
                    detail.removeAttribute('aria-hidden');
                    detail.removeAttribute('aria-expanded');
                    detail.removeAttribute('aria-labelledby');
                }
            });

            // Fix summary elements
            const summaries = container.querySelectorAll('summary');
            summaries.forEach(summary => {
                summary.removeAttribute('role');
                summary.removeAttribute('aria-selected');
                summary.removeAttribute('tabindex');
                summary.removeAttribute('aria-posinset');
                summary.removeAttribute('aria-setsize');
            });
        });
    }

    // Run immediately
    fixTabMarkup();

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(fixTabMarkup, 100);
        });
    } else {
        setTimeout(fixTabMarkup, 100);
    }

    // Run when window loads
    window.addEventListener('load', function() {
        setTimeout(fixTabMarkup, 200);
    });

    // Run with delays to catch WET-BOEW initialization
    setTimeout(fixTabMarkup, 500);
    setTimeout(fixTabMarkup, 1000);

    // Listen for WET-BOEW events
    document.addEventListener('wb-ready.wb', fixTabMarkup);
    document.addEventListener('wb-ready.wb-tabs', fixTabMarkup);

    // Listen for tab clicks to re-apply fixes
    document.addEventListener('click', function(e) {
        if (e.target.matches('.wb-tabs a[role="tab"]') || e.target.matches('.wb-tabs a')) {
            setTimeout(fixTabMarkup, 50);
        }
    });
})();
