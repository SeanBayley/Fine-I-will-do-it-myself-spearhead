/**
 * Shared faction → spearhead picker helpers for solo (index) and local 2P (match-setup).
 * Manifest entries may be legacy { name, dataFile } or new { name, factionId, spearheads[] }.
 */
(function (global) {
    'use strict';

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
     * Build a faction card with an inline spearhead <select>.
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
        card.setAttribute('aria-expanded', 'false');
        card.setAttribute('aria-haspopup', 'listbox');

        const picker = document.createElement('div');
        picker.className = 'spearhead-picker';
        picker.hidden = true;

        const label = document.createElement('label');
        label.className = 'spearhead-picker-label';
        const labelId = `spearhead-label-${faction.factionId}`;
        label.id = labelId;
        label.textContent = 'Spearhead';

        const select = document.createElement('select');
        select.className = 'spearhead-select';
        select.setAttribute('aria-labelledby', labelId);
        select.dataset.factionId = faction.factionId;

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent =
            faction.spearheads.length > 1 ? 'Choose a Spearhead…' : 'Select Spearhead';
        placeholder.disabled = true;
        placeholder.selected = true;
        select.appendChild(placeholder);

        faction.spearheads.forEach((spearhead) => {
            const option = document.createElement('option');
            option.value = spearhead.dataFile;
            option.textContent = spearhead.name;
            select.appendChild(option);
        });

        // Stop select interactions from re-toggling the card
        picker.addEventListener('click', (event) => event.stopPropagation());
        select.addEventListener('click', (event) => event.stopPropagation());
        select.addEventListener('mousedown', (event) => event.stopPropagation());

        select.addEventListener('change', () => {
            const dataFile = select.value;
            if (!dataFile) return;
            const spearhead = faction.spearheads.find((s) => s.dataFile === dataFile);
            console.log('Spearhead chosen', faction.factionId, dataFile);
            if (typeof onSpearheadChosen === 'function') {
                onSpearheadChosen(dataFile, { faction, spearhead });
            }
        });

        picker.appendChild(label);
        picker.appendChild(select);
        wrap.appendChild(card);
        wrap.appendChild(picker);

        function openPicker() {
            wrap.classList.add('is-open');
            card.setAttribute('aria-expanded', 'true');
            picker.hidden = false;
        }

        function closePicker() {
            wrap.classList.remove('is-open');
            card.setAttribute('aria-expanded', 'false');
            // Keep picker visible if this wrap is the selected faction
            if (!wrap.classList.contains('is-selected')) {
                picker.hidden = true;
            }
        }

        card.addEventListener('click', () => {
            const alreadyOpen = wrap.classList.contains('is-open');
            // Caller usually closes others; open this one
            openPicker();

            // Single spearhead: auto-select and load on first open/click
            if (faction.spearheads.length === 1) {
                const only = faction.spearheads[0];
                if (select.value !== only.dataFile) {
                    select.value = only.dataFile;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (typeof onSpearheadChosen === 'function') {
                    // Re-click same faction / same spearhead — still load
                    onSpearheadChosen(only.dataFile, { faction, spearhead: only });
                }
                return;
            }

            // Multi: if already chosen, re-fire; otherwise wait for dropdown
            if (select.value) {
                const spearhead = faction.spearheads.find((s) => s.dataFile === select.value);
                if (typeof onSpearheadChosen === 'function') {
                    onSpearheadChosen(select.value, { faction, spearhead });
                }
            } else if (!alreadyOpen) {
                console.log('Faction opened; awaiting spearhead choice', faction.factionId);
            }
        });

        // Restore prior selection into the select
        if (selectedDataFile) {
            const match = faction.spearheads.find((s) => s.dataFile === selectedDataFile);
            if (match) {
                select.value = match.dataFile;
                openPicker();
                wrap.classList.add('is-selected');
                card.classList.add('selected');
                picker.hidden = false;
            }
        }

        return {
            wrap,
            card,
            select,
            picker,
            faction,
            openPicker,
            closePicker,
            setSelected(dataFile) {
                const owns = faction.spearheads.some((s) => s.dataFile === dataFile);
                wrap.classList.toggle('is-selected', owns);
                card.classList.toggle('selected', owns);
                if (owns) {
                    select.value = dataFile;
                    openPicker();
                    picker.hidden = false;
                } else {
                    closePicker();
                }
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
        populateFactionGrid
    };
})(window);
