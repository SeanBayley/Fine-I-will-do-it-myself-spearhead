/**
 * Shared faction → spearhead picker helpers for solo (index) and local 2P (match-setup).
 * Manifest entries may be legacy { name, dataFile } or new { name, factionId, spearheads[] }.
 */
(function (global) {
    'use strict';

    // Modal state
    let currentModalCallback = null;
    let currentModalFaction = null;

    function normalizeFactionEntry(raw) {
        if (!raw || typeof raw !== 'object') return null;

        // Legacy: one dataFile on the faction itself
        if (raw.dataFile && !Array.isArray(raw.spearheads)) {
            const factionId =
                raw.factionId ||
                String(raw.dataFile)
                    .replace(/^.*\//, '')
                    .replace(/\.json$/i, '')
                    .replace(/_/g, '-');
            return {
                name: raw.name || factionId,
                factionId,
                spearheads: [
                    {
                        name: raw.spearheadName || raw.name || 'Spearhead',
                        dataFile: raw.dataFile
                    }
                ]
            };
        }

        const spearheads = (raw.spearheads || [])
            .filter((s) => s && s.dataFile)
            .map((s) => ({
                name: s.name || s.spearheadName || 'Spearhead',
                dataFile: s.dataFile
            }));

        if (!spearheads.length) {
            console.warn('Faction entry has no spearheads:', raw);
            return null;
        }

        const factionId =
            raw.factionId ||
            spearheads[0].dataFile
                .replace(/^.*\//, '')
                .replace(/\.json$/i, '')
                .replace(/_/g, '-');

        return {
            name: raw.name || factionId,
            factionId,
            spearheads
        };
    }

    function normalizeManifest(manifest) {
        const factions = (manifest?.factions || [])
            .map(normalizeFactionEntry)
            .filter(Boolean);
        return { factions };
    }

    function findFactionForDataFile(factions, dataFile) {
        if (!dataFile) return null;
        return (
            factions.find((f) => f.spearheads.some((s) => s.dataFile === dataFile)) || null
        );
    }

    function findSpearhead(factions, dataFile) {
        const faction = findFactionForDataFile(factions, dataFile);
        if (!faction) return null;
        return faction.spearheads.find((s) => s.dataFile === dataFile) || null;
    }

    /**
     * Open the spearhead selection modal
     */
    function openSpearheadModal(faction, onSpearheadChosen) {
        const modal = document.getElementById('spearhead-modal');
        const titleEl = document.getElementById('spearhead-modal-title');
        const optionsEl = document.getElementById('spearhead-options');
        
        if (!modal || !optionsEl) {
            console.warn('Spearhead modal elements not found, falling back to first spearhead');
            if (faction.spearheads.length > 0 && typeof onSpearheadChosen === 'function') {
                const first = faction.spearheads[0];
                onSpearheadChosen(first.dataFile, { faction, spearhead: first });
            }
            return;
        }

        currentModalCallback = onSpearheadChosen;
        currentModalFaction = faction;

        // Set faction theme colors on modal
        const content = modal.querySelector('.spearhead-modal-content');
        if (content) {
            content.className = 'spearhead-modal-content';
            content.classList.add(`theme-${faction.factionId}`);
            // Apply faction CSS variables
            const themeClass = `theme-${faction.factionId}`;
            const factionCard = document.querySelector(`.faction-card.${themeClass}`);
            if (factionCard) {
                const styles = getComputedStyle(factionCard);
                const primaryColor = styles.getPropertyValue('--primary-color').trim();
                const primaryRgb = styles.getPropertyValue('--primary-color-rgb').trim();
                if (primaryColor) content.style.setProperty('--primary-color', primaryColor);
                if (primaryRgb) content.style.setProperty('--primary-color-rgb', primaryRgb);
            }
        }

        // Update title
        if (titleEl) {
            titleEl.textContent = faction.name;
        }

        // Clear and populate options
        optionsEl.innerHTML = '';
        faction.spearheads.forEach((spearhead) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'spearhead-option';
            btn.textContent = spearhead.name;
            btn.dataset.dataFile = spearhead.dataFile;
            btn.addEventListener('click', () => {
                selectSpearheadFromModal(spearhead.dataFile);
            });
            optionsEl.appendChild(btn);
        });

        // Show modal
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        // Focus first option for accessibility
        const firstOption = optionsEl.querySelector('.spearhead-option');
        if (firstOption) {
            setTimeout(() => firstOption.focus(), 100);
        }

        console.log('Spearhead modal opened for', faction.name);
    }

    /**
     * Close the spearhead modal
     */
    function closeSpearheadModal() {
        const modal = document.getElementById('spearhead-modal');
        if (modal) {
            modal.classList.remove('is-open');
        }
        document.body.style.overflow = '';
        currentModalCallback = null;
        currentModalFaction = null;
    }

    /**
     * Handle spearhead selection from modal
     */
    function selectSpearheadFromModal(dataFile) {
        if (!currentModalFaction || !currentModalCallback) {
            closeSpearheadModal();
            return;
        }

        const spearhead = currentModalFaction.spearheads.find((s) => s.dataFile === dataFile);
        const faction = currentModalFaction;
        const callback = currentModalCallback;

        closeSpearheadModal();

        if (spearhead && typeof callback === 'function') {
            console.log('Spearhead chosen from modal:', faction.factionId, dataFile);
            callback(dataFile, { faction, spearhead });
        }
    }

    /**
     * Initialize modal event listeners (call once on page load)
     */
    function initSpearheadModal() {
        const modal = document.getElementById('spearhead-modal');
        const closeBtn = document.getElementById('spearhead-modal-close');

        if (!modal) return;

        // Close on X button
        if (closeBtn) {
            closeBtn.addEventListener('click', closeSpearheadModal);
        }

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSpearheadModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeSpearheadModal();
            }
        });
    }

    // Initialize modal on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSpearheadModal);
    } else {
        initSpearheadModal();
    }

    /**
     * Build a faction card.
     * Single spearhead: auto-selects on click.
     * Multiple spearheads: opens themed modal for selection.
     * @param {object} faction normalized faction
     * @param {object} opts
     * @param {(dataFile: string, meta: {faction, spearhead}) => void} opts.onSpearheadChosen
     * @param {string|null} [opts.selectedDataFile]
     */
    function createFactionCard(faction, opts) {
        const onSpearheadChosen = opts?.onSpearheadChosen;
        const selectedDataFile = opts?.selectedDataFile || null;

        const wrap = document.createElement('div');
        wrap.className = 'faction-card-wrap';
        wrap.dataset.factionId = faction.factionId;

        const card = document.createElement('button');
        card.type = 'button';
        card.className = `faction-card theme-${faction.factionId}`;
        card.dataset.factionId = faction.factionId;
        card.textContent = faction.name;

        // For multi-spearhead factions, indicate there's a choice
        if (faction.spearheads.length > 1) {
            card.setAttribute('aria-haspopup', 'dialog');
        }

        wrap.appendChild(card);

        // Track current selection
        let currentDataFile = selectedDataFile;

        function markSelected(dataFile) {
            currentDataFile = dataFile;
            const owns = faction.spearheads.some((s) => s.dataFile === dataFile);
            wrap.classList.toggle('is-selected', owns);
            card.classList.toggle('selected', owns);
        }

        card.addEventListener('click', () => {
            // Single spearhead: auto-select
            if (faction.spearheads.length === 1) {
                const only = faction.spearheads[0];
                console.log('Single spearhead auto-selected:', faction.factionId, only.dataFile);
                if (typeof onSpearheadChosen === 'function') {
                    onSpearheadChosen(only.dataFile, { faction, spearhead: only });
                }
                return;
            }

            // Multiple spearheads: open modal
            openSpearheadModal(faction, (dataFile, meta) => {
                markSelected(dataFile);
                if (typeof onSpearheadChosen === 'function') {
                    onSpearheadChosen(dataFile, meta);
                }
            });
        });

        // Restore prior selection
        if (selectedDataFile) {
            markSelected(selectedDataFile);
        }

        return {
            wrap,
            card,
            faction,
            setSelected(dataFile) {
                markSelected(dataFile);
            }
        };
    }

    /**
     * Populate a grid with faction cards.
     * @returns {{ factions, cards, setSelectedDataFile }}
     */
    function populateFactionGrid(container, manifest, opts) {
        const { factions } = normalizeManifest(manifest);
        container.innerHTML = '';
        const cards = factions.map((faction) => {
            const cardApi = createFactionCard(faction, {
                onSpearheadChosen: opts?.onSpearheadChosen,
                selectedDataFile: opts?.selectedDataFile || null
            });
            container.appendChild(cardApi.wrap);
            return cardApi;
        });

        function setSelectedDataFile(dataFile) {
            cards.forEach((c) => c.setSelected(dataFile));
        }

        return { factions, cards, setSelectedDataFile };
    }

    global.SpearheadFactionPicker = {
        normalizeFactionEntry,
        normalizeManifest,
        findFactionForDataFile,
        findSpearhead,
        createFactionCard,
        populateFactionGrid,
        openSpearheadModal,
        closeSpearheadModal
    };
})(window);
