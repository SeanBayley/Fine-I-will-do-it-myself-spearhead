/**
 * Match-mode ability / phase-rules / targeting toolkit.
 * Copied and adapted from units.js; scoped per side for local 2-player.
 */
window.createMatchAbilityToolkit = function createMatchAbilityToolkit(options) {
    const {
        getMatch,
        escapeHtml,
        targetingModalIds = {
            modal: 'match-targeting-modal',
            title: 'match-targeting-modal-title',
            abilityName: 'match-targeting-ability-name',
            abilityDescription: 'match-targeting-ability-description',
            range: 'match-targeting-range',
            keywords: 'match-targeting-keywords',
            grid: 'match-targeting-units-grid',
            cancel: 'match-cancel-targeting-btn',
            closeX: 'match-targeting-close-x'
        }
    } = options;

    const EFFECT_SYMBOLS = {
        charge_roll: '⚡',
        save: '🛡️',
        move: '🏃',
        wound: '💪',
        attack: '⚔️',
        hit: '🎯',
        rend: '🗡️',
        damage: '💥'
    };

    let tooltipElement = null;
    let currentTargetingSide = null;
    let currentTargetingAbility = null;
    let currentTargetingCaster = null;
    let currentPhaseAbility = null;
    let selectedTarget = null;

    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function getClock() {
        const match = getMatch();
        return {
            turn: match.activeSide,
            phase: match.currentPhase,
            round: match.currentRound,
            phaseNames: match.phaseNames || [
                'Hero Phase',
                'Movement Phase',
                'Shooting Phase',
                'Charge Phase',
                'Combat Phase',
                'Taking Damage',
                'End of Turn'
            ]
        };
    }

    class AbilityEffect {
        constructor(ability, target, caster, duration, activePhases, relation, sourceSideId) {
            this.id = generateUniqueId();
            this.ability = ability;
            this.target = target;
            this.caster = caster;
            this.duration = duration;
            this.activePhases = activePhases || [];
            // friendly = own army buff; hostile = enemy ability (e.g. Groundshaker)
            this.relation = relation === 'hostile' ? 'hostile' : 'friendly';
            this.sourceSideId = sourceSideId || null;
            this.appliedAt = { ...getClock() };
            this.isActive = true;
        }

        isExpired() {
            const clock = getClock();
            switch (this.duration) {
                case 'until_end_of_phase':
                    return (
                        clock.phase !== this.appliedAt.phase ||
                        clock.turn !== this.appliedAt.turn ||
                        clock.round !== this.appliedAt.round
                    );
                case 'until_end_of_turn':
                    return clock.turn !== this.appliedAt.turn || clock.round !== this.appliedAt.round;
                case 'until_end_of_round':
                    return clock.round !== this.appliedAt.round;
                case 'instant':
                    return true;
                case 'until_start_of_next_phase':
                    return (
                        clock.phase !== this.appliedAt.phase ||
                        clock.turn !== this.appliedAt.turn ||
                        clock.round !== this.appliedAt.round
                    );
                case 'until_start_of_next_hero_phase': {
                    // Shield of Azyr: lasts until the start of that side's next hero phase
                    const heroPhaseIndex = 0;
                    if (clock.phase !== heroPhaseIndex) return false;
                    if (clock.turn !== this.appliedAt.turn) return false;
                    if (clock.round === this.appliedAt.round && this.appliedAt.phase === heroPhaseIndex) {
                        return false;
                    }
                    return (
                        clock.round > this.appliedAt.round ||
                        (clock.round === this.appliedAt.round && this.appliedAt.phase > heroPhaseIndex)
                    );
                }
                default:
                    return false;
            }
        }

        isActiveInCurrentPhase() {
            if (!this.isActive || this.isExpired()) return false;
            const clock = getClock();
            const currentPhaseName = (clock.phaseNames[clock.phase] || '').toLowerCase();
            const phaseMapping = {
                hero_phase: 'hero',
                movement_phase: 'movement',
                shooting_phase: 'shooting',
                charge_phase: 'charge',
                combat_phase: 'combat',
                taking_damage: 'taking damage',
                end_of_turn: 'end of turn',
                all: ''
            };

            return this.activePhases.some((phase) => {
                if (!phase) return false;
                const key = phase.toLowerCase();
                if (key === 'all') return true;
                const mapped = phaseMapping[key] || key.replace(/_/g, ' ');
                return currentPhaseName.includes(mapped);
            });
        }
    }

    function isEnemyTargeting(ability) {
        const type = (ability?.targeting?.type || '').toLowerCase();
        return type.includes('enemy');
    }

    function getOpponentSide(side) {
        const match = getMatch();
        if (!match?.sides || !side) return null;
        return side.id === 'A' ? match.sides.B : match.sides.A;
    }

    /** Side that owns the unit cards the ability may pick from. */
    function getTargetPoolSide(casterSide, ability) {
        if (isEnemyTargeting(ability)) {
            return getOpponentSide(casterSide);
        }
        return casterSide;
    }

    class TargetingSystem {
        getValidTargets(ability, caster, side) {
            if (!ability.targeting) return [];
            const criteria = ability.targeting.targeting_criteria || {};
            const poolSide = getTargetPoolSide(side, ability);
            if (!poolSide?.factionData?.units) {
                console.warn('No target pool for ability', ability.name, {
                    casterSide: side?.id,
                    enemy: isEnemyTargeting(ability)
                });
                return [];
            }
            const allUnits = poolSide.factionData.units;
            return allUnits.filter((unit) => this.isValidTarget(unit, criteria, caster, ability));
        }

        isValidTarget(unit, criteria, caster, ability) {
            if (criteria.keywords?.length) {
                const unitKeywords = unit.keywords || [];
                const ok = criteria.keywords.every((keyword) =>
                    unitKeywords.some((uk) => uk.toLowerCase() === keyword.toLowerCase())
                );
                if (!ok) return false;
            }
            // exclude_self only applies when targeting your own army
            if (!isEnemyTargeting(ability)) {
                if (criteria.exclude_self && unit.name === caster.name) return false;
                if (criteria.exclude_general && unit.keywords?.includes('HERO')) return false;
            }
            return true;
        }
    }

    class EffectManager {
        constructor(side) {
            this.side = side;
            this.activeEffects = [];
            this.effectHistory = [];
        }

        addEffect(effect) {
            this.activeEffects.push(effect);
            this.effectHistory.push({ ...effect, addedAt: new Date().toISOString() });
            this.updateEffectDisplay();
        }

        removeEffect(effectId) {
            const idx = this.activeEffects.findIndex((e) => e.id === effectId);
            if (idx === -1) return;
            const effect = this.activeEffects[idx];
            this.activeEffects.splice(idx, 1);
            this.effectHistory.push({ ...effect, removedAt: new Date().toISOString() });
            this.updateEffectDisplay();
        }

        getEffectsForUnit(unitName) {
            return this.activeEffects.filter((e) => e.target.name === unitName && e.isActive);
        }

        cleanupExpiredEffects() {
            this.activeEffects
                .filter((effect) => {
                    try {
                        return effect.isExpired();
                    } catch (err) {
                        console.warn('Effect expiry check failed', err);
                        return true;
                    }
                })
                .forEach((effect) => this.removeEffect(effect.id));
        }

        updateEffectDisplay() {
            const container = document.getElementById(`side-units-${this.side.id}`);
            if (!container) return;
            container.querySelectorAll('.unit-card').forEach((card) => this.updateUnitCardEffects(card));
        }

        updateUnitCardEffects(unitCard) {
            const unitName = unitCard.dataset.unitName || unitCard.querySelector('h3')?.textContent;
            if (!unitName) return;
            const unitEffects = this.getEffectsForUnit(unitName);

            unitCard.classList.remove(
                'has-effects',
                'has-active-effects',
                'has-active-effects-friendly',
                'has-active-effects-hostile',
                'has-active-effects-both'
            );
            unitCard.querySelectorAll('.temp-effect-ability, .effect-badges').forEach((el) => el.remove());

            if (!unitEffects.length) return;
            unitCard.classList.add('has-effects');

            const activeEffects = unitEffects.filter((e) => {
                try {
                    return e.isActiveInCurrentPhase();
                } catch (err) {
                    return false;
                }
            });

            if (!activeEffects.length) return;

            const hasFriendly = activeEffects.some((e) => e.relation !== 'hostile');
            const hasHostile = activeEffects.some((e) => e.relation === 'hostile');
            // Gold = own buffs, red = enemy abilities, split = both at once
            if (hasFriendly && hasHostile) {
                unitCard.classList.add('has-active-effects-both');
            } else if (hasHostile) {
                unitCard.classList.add('has-active-effects-hostile');
            } else {
                unitCard.classList.add('has-active-effects', 'has-active-effects-friendly');
            }
            this.addEffectSymbolBadges(unitCard, activeEffects);

            const abilitiesList = unitCard.querySelector('.abilities-list');
            if (!abilitiesList) return;
            activeEffects.forEach((effect) => {
                const tempAbility = document.createElement('li');
                tempAbility.className = 'temp-effect-ability';
                const abilitySpan = document.createElement('span');
                abilitySpan.className = 'ability-name temp-effect';
                const effectData = effect.ability.effects?.[0] || {};
                abilitySpan.dataset.description = effectData.description || 'Active effect';
                abilitySpan.dataset.timing = 'Active Effect';
                abilitySpan.dataset.frequency = 'Temporary';
                abilitySpan.textContent = `${effectData.symbol || '⚡'} ${effect.ability.name}`;
                abilitySpan.addEventListener('mouseover', showTooltip);
                abilitySpan.addEventListener('mouseout', hideTooltip);
                tempAbility.appendChild(abilitySpan);
                abilitiesList.appendChild(tempAbility);
            });
        }

        addEffectSymbolBadges(unitCard, activeEffects) {
            const header = unitCard.querySelector('.unit-header-content') || unitCard.querySelector('.unit-header');
            if (!header) return;
            const badgeWrap = document.createElement('div');
            badgeWrap.className = 'effect-badges';

            const byStat = {};
            activeEffects.forEach((effect) => {
                (effect.ability.effects || []).forEach((ed) => {
                    const stat = ed.stat || 'effect';
                    byStat[stat] = byStat[stat] || { count: 0, symbol: ed.symbol || EFFECT_SYMBOLS[stat] || '⚡', desc: [] };
                    byStat[stat].count += 1;
                    if (ed.description) byStat[stat].desc.push(ed.description);
                });
            });

            Object.keys(byStat).forEach((stat) => {
                const info = byStat[stat];
                const badge = document.createElement('span');
                const fromHostile = activeEffects.some(
                    (e) =>
                        e.relation === 'hostile' &&
                        (e.ability.effects || []).some((ed) => (ed.stat || 'effect') === stat)
                );
                badge.className = `effect-badge${fromHostile ? ' effect-badge--hostile' : ''}`;
                badge.title = info.desc.join(' | ') || stat;
                badge.textContent = info.count > 1 ? `${info.symbol}×${info.count}` : info.symbol;
                badgeWrap.appendChild(badge);
            });
            header.appendChild(badgeWrap);
        }

        validateEffectData(effectData) {
            return !!(effectData?.ability?.effects?.length && effectData.target && effectData.caster);
        }
    }

    const targetingSystem = new TargetingSystem();

    function showTooltip(event) {
        const span = event.target.closest('[data-description]');
        if (!span) return;
        if (!tooltipElement) {
            tooltipElement = document.createElement('div');
            tooltipElement.className = 'js-tooltip';
            document.body.appendChild(tooltipElement);
        }
        const timing = span.dataset.timing ? `<div><strong>Timing:</strong> ${span.dataset.timing}</div>` : '';
        const frequency = span.dataset.frequency
            ? `<div><strong>Frequency:</strong> ${span.dataset.frequency}</div>`
            : '';
        tooltipElement.innerHTML = `${timing}${frequency}<div>${span.dataset.description || ''}</div>`;
        tooltipElement.style.display = 'block';
        const move = (e) => {
            tooltipElement.style.left = `${e.pageX + 12}px`;
            tooltipElement.style.top = `${e.pageY + 12}px`;
        };
        move(event);
        span._tooltipMove = move;
        document.addEventListener('mousemove', move);
    }

    function hideTooltip(event) {
        if (tooltipElement) tooltipElement.style.display = 'none';
        const span = event?.target;
        if (span?._tooltipMove) {
            document.removeEventListener('mousemove', span._tooltipMove);
            span._tooltipMove = null;
        }
    }

    function setupTooltips(root) {
        (root || document).querySelectorAll('.ability-name').forEach((span) => {
            span.removeEventListener('mouseover', showTooltip);
            span.removeEventListener('mouseout', hideTooltip);
            span.addEventListener('mouseover', showTooltip);
            span.addEventListener('mouseout', hideTooltip);
        });
    }

    function prepareSide(side) {
        side.abilityUsage = side.abilityUsage || {};
        side.enhancementUsage = side.enhancementUsage || {};
        side.regimentAbilityUsage = side.regimentAbilityUsage || {};
        side.armyRuleUsage = side.armyRuleUsage || {};
        side.effectManager = side.effectManager || new EffectManager(side);
        side.effectSymbols = EFFECT_SYMBOLS;
    }

    function getAbilityUsageKey(unitName, abilityName) {
        return `${unitName}:${abilityName}`;
    }

    function canUseAbility(side, unitName, abilityName) {
        const key = getAbilityUsageKey(unitName, abilityName);
        const usage = side.abilityUsage[key];
        if (!usage) {
            const unit = side.factionData?.units?.find((u) => u.name === unitName);
            const ability = unit?.abilities?.find((a) => a.name === abilityName);
            if (ability?.usage) {
                side.abilityUsage[key] = {
                    used: 0,
                    maxUses: ability.usage.max_uses,
                    resetPeriod: ability.usage.reset_period
                };
            }
            return true;
        }
        return usage.used < usage.maxUses;
    }

    function useAbility(side, unitName, abilityName) {
        const key = getAbilityUsageKey(unitName, abilityName);
        const usage = side.abilityUsage[key];
        if (usage) {
            usage.used += 1;
            console.log(`Side ${side.id} used ${abilityName} (${usage.used}/${usage.maxUses})`);
        }
    }

    function resetAbilityUsage(side, resetPeriod) {
        Object.keys(side.abilityUsage).forEach((key) => {
            if (side.abilityUsage[key].resetPeriod === resetPeriod) {
                side.abilityUsage[key].used = 0;
            }
        });
        [side.enhancementUsage, side.regimentAbilityUsage, side.armyRuleUsage].forEach((store) => {
            Object.keys(store).forEach((key) => {
                if (store[key].resetPeriod === resetPeriod) {
                    store[key].used = 0;
                }
            });
        });
    }

    function canUsePhaseAbility(side, phaseAbility) {
        if (!phaseAbility.usage) return true;
        const maxUses = phaseAbility.usage.max_uses;
        let store;
        let key;
        if (phaseAbility.source === 'Enhancement') {
            store = side.enhancementUsage;
            key = `enhancement_${phaseAbility.name}`;
        } else if (phaseAbility.source === 'Regiment Ability') {
            store = side.regimentAbilityUsage;
            key = `regiment_${phaseAbility.name}`;
        } else if (phaseAbility.source === 'Army Rule') {
            store = side.armyRuleUsage;
            key = `army_rule_${phaseAbility.name}`;
        } else {
            return true;
        }
        const usage = store[key];
        return !usage || usage.used < maxUses;
    }

    function getUsageText(side, phaseAbility) {
        if (!phaseAbility.usage) return '';
        let store;
        let key;
        if (phaseAbility.source === 'Enhancement') {
            store = side.enhancementUsage;
            key = `enhancement_${phaseAbility.name}`;
        } else if (phaseAbility.source === 'Regiment Ability') {
            store = side.regimentAbilityUsage;
            key = `regiment_${phaseAbility.name}`;
        } else if (phaseAbility.source === 'Army Rule') {
            store = side.armyRuleUsage;
            key = `army_rule_${phaseAbility.name}`;
        } else {
            return '';
        }
        const usage = store[key];
        if (!usage) return ` (0/${phaseAbility.usage.max_uses})`;
        return ` (${usage.used}/${usage.maxUses})`;
    }

    function trackPhaseAbilityUsage(side, abilityName, source, maxUses, resetPeriod) {
        let store;
        let key;
        if (source === 'Enhancement') {
            store = side.enhancementUsage;
            key = `enhancement_${abilityName}`;
        } else if (source === 'Regiment Ability') {
            store = side.regimentAbilityUsage;
            key = `regiment_${abilityName}`;
        } else if (source === 'Army Rule') {
            store = side.armyRuleUsage;
            key = `army_rule_${abilityName}`;
        } else {
            return;
        }
        if (!store[key]) store[key] = { used: 0, maxUses, resetPeriod };
        store[key].used += 1;
    }

    function getPhaseKey(timing) {
        if (!timing) return null;
        const lowerTiming = timing.toLowerCase();
        if (lowerTiming.includes('hero phase')) return 'hero';
        if (lowerTiming.includes('movement phase')) return 'movement';
        if (lowerTiming.includes('shooting phase')) return 'shooting';
        if (lowerTiming.includes('charge phase')) return 'charge';
        if (lowerTiming.includes('combat phase')) return 'combat';
        if (lowerTiming.includes('end of turn')) return 'end';
        if (lowerTiming.includes('taking damage')) return 'taking-damage';
        return null;
    }

    function findPhaseAbilityData(side, abilityName, source) {
        const factionData = side.factionData;
        if (!factionData) return null;
        if (source === 'Enhancement') return factionData.enhancements?.find((e) => e.name === abilityName);
        if (source === 'Regiment Ability') return factionData.regimentAbilities?.find((r) => r.name === abilityName);
        if (source === 'Army Rule') return factionData.armyRules?.find((a) => a.name === abilityName);
        return null;
    }

    const FACTION_CHIP = {
        'stormcast-eternals': { color: '#0d6efd', rgb: '13, 110, 253' },
        skaven: { color: '#8FD129', rgb: '143, 209, 41' },
        seraphon: { color: '#40E0D0', rgb: '64, 224, 208' },
        'ossiarch-bonereapers': { color: '#F5F5DC', rgb: '245, 245, 220' },
        sylvaneth: { color: '#22c55e', rgb: '34, 197, 94' },
        'daughters-of-khaine': { color: '#be123c', rgb: '190, 18, 60' },
        'cities-of-sigmar': { color: '#b91c1c', rgb: '185, 28, 28' },
        'helsmiths-of-hashut': { color: '#1f4d38', rgb: '31, 77, 56' },
        'idoneth-deepkin': { color: '#0f766e', rgb: '15, 118, 110' }
    };

    function getSideChipStyle(side) {
        const id = side.factionData?.factionId || '';
        const chip = FACTION_CHIP[id] || { color: '#9ca3af', rgb: '156, 163, 175' };
        return `--chip-color:${chip.color};--chip-rgb:${chip.rgb};`;
    }

    function collectSidePhaseAbilities(side) {
        const phaseAbilities = {
            hero: [],
            movement: [],
            shooting: [],
            charge: [],
            combat: [],
            'taking-damage': [],
            end: []
        };
        const factionData = side.factionData;
        if (!factionData) return phaseAbilities;

        const selectedAbilityName = side.ability || '';
        const selectedEnhancementName = side.enhancement || '';

        const pushItem = (phaseKey, item) => {
            if (!phaseKey || !phaseAbilities[phaseKey]) return;
            phaseAbilities[phaseKey].push({
                ...item,
                sideId: side.id,
                sideName: side.displayName,
                factionId: factionData.factionId || ''
            });
        };

        if (selectedEnhancementName && factionData.enhancements) {
            const selectedEnhancement = factionData.enhancements.find((e) => e.name === selectedEnhancementName);
            if (selectedEnhancement) {
                const phaseKey = getPhaseKey(selectedEnhancement.timing);
                if (phaseKey) {
                    pushItem(phaseKey, {
                        name: selectedEnhancement.name,
                        description: selectedEnhancement.description,
                        source: 'Enhancement',
                        timing: selectedEnhancement.timing,
                        frequency: selectedEnhancement.frequency,
                        targeting: selectedEnhancement.targeting,
                        effects: selectedEnhancement.effects,
                        usage: selectedEnhancement.usage,
                        abilityData: selectedEnhancement
                    });
                } else {
                    pushItem('hero', {
                        name: selectedEnhancement.name,
                        description: selectedEnhancement.description,
                        source: 'Enhancement (Passive)',
                        timing: selectedEnhancement.timing || 'Passive',
                        frequency: selectedEnhancement.frequency,
                        isPassiveEnhancement: true
                    });
                }
            }
        }

        const hasReinforcements = factionData.units?.some((unit) =>
            unit.keywords?.some((kw) => kw.toUpperCase() === 'REINFORCEMENTS')
        );
        if (hasReinforcements) {
            pushItem('movement', {
                name: 'Call for Reinforcements',
                description:
                    'Declare: Pick a friendly REINFORCEMENTS unit that has been destroyed. Effect: Set up an identical replacement unit on the battlefield, wholly within friendly territory, wholly within 6" of the battlefield edge and not in combat. Each REINFORCEMENTS unit can only be replaced once. Replacement units cannot themselves be replaced.',
                source: 'Core Rule',
                timing: 'Movement Phase',
                frequency: 'Once per turn per unit'
            });
        }

        (factionData.armyRules || []).forEach((rule) => {
            pushItem(getPhaseKey(rule.timing), {
                name: rule.name,
                description: rule.description,
                source: 'Army Rule',
                timing: rule.timing,
                frequency: rule.frequency,
                targeting: rule.targeting,
                effects: rule.effects,
                usage: rule.usage,
                abilityData: rule
            });
        });

        (factionData.regimentAbilities || []).forEach((ability) => {
            if (ability.name !== selectedAbilityName) return;
            pushItem(getPhaseKey(ability.timing), {
                name: ability.name,
                description: ability.description,
                source: 'Regiment Ability',
                timing: ability.timing,
                frequency: ability.frequency,
                targeting: ability.targeting,
                effects: ability.effects,
                usage: ability.usage,
                abilityData: ability
            });
        });

        (factionData.units || []).forEach((unit) => {
            (unit.abilities || []).forEach((ability) => {
                pushItem(getPhaseKey(ability.timing), {
                    name: ability.name,
                    description: ability.description,
                    source: unit.name,
                    timing: ability.timing,
                    frequency: ability.frequency
                });
            });
            ['rangedWeapons', 'meleeWeapons'].forEach((weaponKey) => {
                (unit[weaponKey] || []).forEach((weapon) => {
                    (weapon.abilities || []).forEach((ability) => {
                        pushItem(getPhaseKey(ability.timing), {
                            name: ability.name,
                            description: ability.description,
                            source: `${unit.name} (${weapon.name})`,
                            timing: ability.timing,
                            frequency: ability.frequency
                        });
                    });
                });
            });
        });

        return phaseAbilities;
    }

    function populateUnifiedPhaseRules(sides) {
        const phaseColumn = document.getElementById('match-unified-phases');
        if (!phaseColumn) return;

        const sideList = ['A', 'B'].map((id) => sides[id]).filter((s) => s?.factionData);
        if (!sideList.length) return;

        const corePhaseRules = {
            hero: [],
            movement: [
                { name: 'Move', description: "Standard move up to the unit's Move characteristic." },
                {
                    name: 'Run',
                    description:
                        'Unit cannot shoot or charge later. Roll a D6 and add the result to the Move characteristic for this phase.'
                }
            ],
            shooting: [{ name: 'Shoot', description: 'Units shoot with their ranged weapons if eligible.' }],
            charge: [
                {
                    name: 'Charge',
                    description:
                        'Roll 2D6. If the result is >= the distance to the target enemy unit, move your unit within 1/2" of the target.'
                }
            ],
            combat: [
                {
                    name: 'Fight',
                    description: 'Starting with the active player, players alternate picking eligible units to fight.'
                }
            ],
            'taking-damage': [{ name: 'Remember Ward Saves', description: '' }],
            end: [{ name: 'Score Objectives', description: 'Check conditions for scoring objectives.' }]
        };

        const merged = {
            hero: [],
            movement: [],
            shooting: [],
            charge: [],
            combat: [],
            'taking-damage': [],
            end: []
        };

        sideList.forEach((side) => {
            const sidePhases = collectSidePhaseAbilities(side);
            Object.keys(merged).forEach((key) => {
                merged[key].push(...(sidePhases[key] || []));
            });
        });

        const match = getMatch();
        const phaseDetailsElements = phaseColumn.querySelectorAll('details.phase-section');

        phaseDetailsElements.forEach((detailsEl) => {
            const phaseKey = detailsEl.dataset.phase;
            const summary = detailsEl.querySelector('summary');
            while (detailsEl.lastChild && detailsEl.lastChild !== summary) {
                detailsEl.removeChild(detailsEl.lastChild);
            }

            const itemsForPhase = [];
            (corePhaseRules[phaseKey] || []).forEach((coreRule) => {
                itemsForPhase.push({ name: coreRule.name, description: coreRule.description, isCore: true });
            });
            (merged[phaseKey] || []).forEach((ability) => {
                itemsForPhase.push({ ...ability, isCore: false });
            });

            if (!itemsForPhase.length) {
                const noContentMsg = document.createElement('p');
                noContentMsg.textContent = '(No specific rules or abilities for this phase)';
                noContentMsg.style.fontSize = '0.9em';
                noContentMsg.style.padding = '0.5em 0.8em';
                detailsEl.appendChild(noContentMsg);
                return;
            }

            const list = document.createElement('ul');
            itemsForPhase.forEach((item) => {
                const listItem = document.createElement('li');
                if (item.isCore) {
                    listItem.className = 'phase-ability-core';
                    listItem.innerHTML = `<strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(item.description)}`;
                } else {
                    const side = sides[item.sideId];
                    const chip = `<span class="phase-side-chip" style="${getSideChipStyle(side)}">${escapeHtml(item.sideName || item.sideId)}</span>`;
                    if (item.targeting && item.effects && side) {
                        const canUse = canUsePhaseAbility(side, item);
                        const usageText = item.usage ? getUsageText(side, item) : '';
                        const enabled = canUse && match.isActive && match.activeSide === item.sideId;
                        listItem.innerHTML = `
                            <div class="phase-ability-row ability-with-button">
                                ${chip}
                                <span class="ability-name" data-description="${escapeHtml(item.description || '')}" data-timing="${escapeHtml(item.timing || '')}" data-frequency="${escapeHtml(item.frequency || '')}">${escapeHtml(item.name)}${usageText}</span>
                                <span class="ability-source">(${escapeHtml(item.source || '')})</span>
                                <button type="button" class="phase-ability-use-btn ${enabled ? '' : 'disabled'}"
                                    data-side="${item.sideId}"
                                    data-ability-source="${escapeHtml(item.source || '')}"
                                    data-ability-name="${escapeHtml(item.name)}"
                                    ${enabled ? '' : 'disabled'}>
                                    ${canUse ? 'Use' : 'Used'}
                                </button>
                            </div>
                        `;
                    } else {
                        listItem.innerHTML = `
                            <div class="phase-ability-row">
                                ${chip}
                                <span class="ability-name" data-description="${escapeHtml(item.description || '')}" data-timing="${escapeHtml(item.timing || '')}" data-frequency="${escapeHtml(item.frequency || '')}">${escapeHtml(item.name)}</span>
                                <span class="ability-source">(${escapeHtml(item.source || '')})</span>
                            </div>
                        `;
                    }
                }
                list.appendChild(listItem);
            });
            detailsEl.appendChild(list);
        });

        setupTooltips(phaseColumn);
        attachUnifiedPhaseAbilityListeners(sides);
        highlightUnifiedCurrentPhase();
    }

    // Back-compat alias used by older call sites
    function populatePhaseRules(sideOrSides) {
        const match = getMatch();
        if (sideOrSides?.A || sideOrSides?.B) {
            populateUnifiedPhaseRules(sideOrSides);
            return;
        }
        populateUnifiedPhaseRules(match.sides);
    }

    function attachUnifiedPhaseAbilityListeners(sides) {
        const phaseColumn = document.getElementById('match-unified-phases');
        if (!phaseColumn) return;
        phaseColumn.querySelectorAll('.phase-ability-use-btn').forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const side = sides[btn.dataset.side];
                if (!side) return;
                const abilityName = btn.dataset.abilityName;
                const source = btn.dataset.abilitySource;
                const abilityData = findPhaseAbilityData(side, abilityName, source);
                if (!abilityData) {
                    console.error('Phase ability not found', abilityName, source);
                    return;
                }
                showPhaseAbilityTargetingModal(side, abilityData, source);
            };
        });
    }

    function highlightUnifiedCurrentPhase() {
        const match = getMatch();
        const phaseColumn = document.getElementById('match-unified-phases');
        if (!phaseColumn) return;
        const phases = match.phases || ['hero', 'movement', 'shooting', 'charge', 'combat', 'taking-damage', 'end'];
        phaseColumn.querySelectorAll('.phase-section').forEach((section) => {
            const isCurrent = match.isActive && section.dataset.phase === phases[match.currentPhase];
            section.classList.toggle('active', isCurrent);
            // Advance phase: open only the current phase; collapse all others
            section.open = !!isCurrent;
        });
    }

    function highlightCurrentPhase() {
        highlightUnifiedCurrentPhase();
    }

    function showPhaseAbilityTargetingModal(side, abilityData, source) {
        let caster;
        if (source === 'Enhancement' || source === 'Army Rule') {
            caster =
                side.factionData?.units?.find((u) => u.keywords?.includes('HERO')) ||
                side.factionData?.units?.[0] ||
                { name: 'General', keywords: [] };
        } else {
            caster = { name: 'Regiment', keywords: [] };
        }

        const abilityForTargeting = {
            name: abilityData.name,
            description: abilityData.description,
            targeting: abilityData.targeting,
            effects: abilityData.effects
        };

        currentPhaseAbility = { side, abilityData, source, caster };
        const validTargets = targetingSystem.getValidTargets(abilityForTargeting, caster, side);
        if (!validTargets.length) {
            // Clear stale context when no targets (solo bug fix ported)
            currentPhaseAbility = null;
            alert(
                isEnemyTargeting(abilityForTargeting)
                    ? 'No valid enemy targets for this ability'
                    : 'No valid targets for this ability'
            );
            return;
        }
        showTargetingModal(side, abilityForTargeting, caster);
    }

    function applyPhaseAbilityEffects(side, abilityData, target, source, caster) {
        const relation = isEnemyTargeting(abilityData) ? 'hostile' : 'friendly';
        const targetSide = getTargetPoolSide(side, abilityData) || side;

        (abilityData.effects || []).forEach((effectData) => {
            if (effectData.duration === 'instant') {
                console.log(
                    `Side ${side.id} instant effect (${relation}): ${effectData.description} → ${target.name} [side ${targetSide.id}]`
                );
                return;
            }
            const effect = new AbilityEffect(
                { name: abilityData.name, effects: abilityData.effects },
                target,
                caster,
                effectData.duration,
                effectData.active_phases,
                relation,
                side.id
            );
            targetSide.effectManager.addEffect(effect);
        });

        if (abilityData.usage) {
            trackPhaseAbilityUsage(
                side,
                abilityData.name,
                source,
                abilityData.usage.max_uses,
                abilityData.usage.reset_period
            );
        }

        targetSide.effectManager.updateEffectDisplay();
        if (targetSide.id !== side.id) {
            renderSideUnits(targetSide);
        }
        populateUnifiedPhaseRules(getMatch().sides);
        closeTargetingModal();
    }

    function activateAbility(side, ability, caster) {
        if (!canUseAbility(side, caster.name, ability.name)) {
            console.log(`Cannot use ${ability.name} on side ${side.id}`);
            return;
        }

        if (ability.targeting) {
            const validTargets = targetingSystem.getValidTargets(ability, caster, side);
            if (!validTargets.length) {
                alert(
                    isEnemyTargeting(ability)
                        ? 'No valid enemy targets for this ability'
                        : 'No valid targets for this ability'
                );
                return;
            }
            currentPhaseAbility = null;
            showTargetingModal(side, ability, caster);
            return;
        }

        applyAbilityEffects(side, ability, caster, caster);
        renderSideUnits(side);
    }

    function applyAbilityEffects(side, ability, target, caster) {
        if (!ability.effects) {
            console.warn('Ability has no effects', ability.name);
            return;
        }
        if (!side.effectManager.validateEffectData({ ability, target, caster })) return;

        const relation = isEnemyTargeting(ability) ? 'hostile' : 'friendly';
        const targetSide = getTargetPoolSide(side, ability) || side;

        useAbility(side, caster.name, ability.name);
        ability.effects.forEach((effectData) => {
            if (effectData.duration === 'instant') {
                console.log(
                    `Side ${side.id} instant unit effect (${relation}): ${effectData.description} → ${target.name}`
                );
                return;
            }
            const effect = new AbilityEffect(
                ability,
                target,
                caster,
                effectData.duration,
                effectData.active_phases,
                relation,
                side.id
            );
            targetSide.effectManager.addEffect(effect);
        });
        targetSide.effectManager.updateEffectDisplay();
        return targetSide;
    }

    function showTargetingModal(side, ability, caster) {
        currentTargetingSide = side;
        currentTargetingAbility = ability;
        currentTargetingCaster = caster;
        selectedTarget = null;

        const hostile = isEnemyTargeting(ability);
        const modal = document.getElementById(targetingModalIds.modal);
        modal.classList.toggle('targeting-modal--enemy', hostile);

        document.getElementById(targetingModalIds.title).textContent = hostile
            ? `Select Enemy Target for ${ability.name}`
            : `Select Target for ${ability.name}`;
        document.getElementById(targetingModalIds.abilityName).textContent = ability.name;
        document.getElementById(targetingModalIds.abilityDescription).textContent = ability.description || '';
        document.getElementById(targetingModalIds.range).textContent = `Range: ${ability.targeting?.range || '—'}`;
        const keywords = ability.targeting?.targeting_criteria?.keywords || [];
        document.getElementById(targetingModalIds.keywords).textContent = `Keywords: ${keywords.join(', ') || 'Any'}`;

        const grid = document.getElementById(targetingModalIds.grid);
        grid.innerHTML = '';
        const validTargets = targetingSystem.getValidTargets(ability, caster, side);
        validTargets.forEach((unit) => {
            const card = document.createElement('div');
            card.className = `targeting-unit-card ${hostile ? 'targeting-unit-card--enemy' : 'targeting-unit-card--friendly'}`;
            card.innerHTML = `
                <div class="targeting-unit-name">${escapeHtml(unit.name)}</div>
                <div class="targeting-unit-keywords">${escapeHtml((unit.keywords || []).join(', '))}</div>
                <div class="targeting-unit-stats">
                    <div class="targeting-unit-stat"><span class="stat-label">Health:</span><span>${escapeHtml(unit.stats?.health ?? '—')}</span></div>
                    <div class="targeting-unit-stat"><span class="stat-label">Save:</span><span>${escapeHtml(unit.stats?.save ?? '—')}</span></div>
                </div>
            `;
            card.addEventListener('click', () => {
                grid.querySelectorAll('.targeting-unit-card.selected').forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedTarget = unit;

                if (currentPhaseAbility) {
                    applyPhaseAbilityEffects(
                        currentPhaseAbility.side,
                        currentPhaseAbility.abilityData,
                        selectedTarget,
                        currentPhaseAbility.source,
                        currentPhaseAbility.caster
                    );
                    currentPhaseAbility = null;
                } else {
                    const targetSide = applyAbilityEffects(side, ability, selectedTarget, caster);
                    closeTargetingModal();
                    renderSideUnits(side);
                    if (targetSide && targetSide.id !== side.id) {
                        renderSideUnits(targetSide);
                    }
                }
            });
            grid.appendChild(card);
        });

        document.getElementById(targetingModalIds.modal).style.display = 'flex';
    }

    function closeTargetingModal() {
        document.getElementById(targetingModalIds.modal).style.display = 'none';
        document.getElementById(targetingModalIds.modal)?.classList.remove('targeting-modal--enemy');
        currentTargetingSide = null;
        currentTargetingAbility = null;
        currentTargetingCaster = null;
        currentPhaseAbility = null;
        selectedTarget = null;
    }

    const collapsedUnitKeys = new Set();

    function unitCollapseKey(sideId, unitName) {
        return `${sideId}::${unitName}`;
    }

        function renderUnitCard(side, unit) {
        const card = document.createElement('div');
        card.className = 'unit-card';
        card.dataset.unitName = unit.name;
        card.dataset.side = side.id;

        const collapseKey = unitCollapseKey(side.id, unit.name);
        const fold = document.createElement('details');
        fold.className = 'unit-card-fold';
        fold.open = !collapsedUnitKeys.has(collapseKey);
        fold.addEventListener('toggle', () => {
            if (fold.open) collapsedUnitKeys.delete(collapseKey);
            else collapsedUnitKeys.add(collapseKey);
        });

        let statsHtml = '';
        if (unit.stats) {
            Object.keys(unit.stats).forEach((key) => {
                statsHtml += `<div class="stat-box"><span class="stat-label">${escapeHtml(key.toUpperCase())}</span><span class="stat-value">${escapeHtml(unit.stats[key])}</span></div>`;
            });
        }

        let weaponsHtml = '';
        if (unit.rangedWeapons?.length) {
            weaponsHtml += '<details class="weapon-section"><summary><h4 class="card-section-header">Ranged Weapons</h4></summary><ul>';
            unit.rangedWeapons.forEach((w) => {
                weaponsHtml += `<li><strong>${escapeHtml(w.name)}</strong> — ${escapeHtml(w.range)} / A${escapeHtml(w.attacks)} / ${escapeHtml(w.hit)} / ${escapeHtml(w.wound)} / R${escapeHtml(w.rend)} / D${escapeHtml(w.damage)}</li>`;
            });
            weaponsHtml += '</ul></details>';
        }
        if (unit.meleeWeapons?.length) {
            weaponsHtml += '<details class="weapon-section"><summary><h4 class="card-section-header">Melee Weapons</h4></summary><ul>';
            unit.meleeWeapons.forEach((w) => {
                weaponsHtml += `<li><strong>${escapeHtml(w.name)}</strong> — A${escapeHtml(w.attacks)} / ${escapeHtml(w.hit)} / ${escapeHtml(w.wound)} / R${escapeHtml(w.rend)} / D${escapeHtml(w.damage)}</li>`;
            });
            weaponsHtml += '</ul></details>';
        }

        let abilitiesHtml = '';
        if (unit.abilities?.length) {
            abilitiesHtml = '<h4 class="card-section-header">Abilities</h4><ul class="abilities-list">';
            unit.abilities.forEach((ability) => {
                const description = escapeHtml(ability.description || '');
                const timing = escapeHtml(ability.timing || '');
                const frequency = escapeHtml(ability.frequency || '');
                if (ability.targeting) {
                    const canUse = canUseAbility(side, unit.name, ability.name);
                    const usage = side.abilityUsage[getAbilityUsageKey(unit.name, ability.name)];
                    const usageText = usage ? ` (${usage.used}/${usage.maxUses})` : '';
                    const match = getMatch();
                    const enabled = canUse && match.isActive && match.activeSide === side.id;
                    abilitiesHtml += `<li class="ability-with-button">
                        <span class="ability-name" data-description="${description}" data-timing="${timing}" data-frequency="${frequency}">${escapeHtml(ability.name)}${usageText}</span>
                        <button type="button" class="ability-activate-btn ${enabled ? '' : 'disabled'}"
                            data-side="${side.id}"
                            data-ability-name="${escapeHtml(ability.name)}"
                            data-unit-name="${escapeHtml(unit.name)}"
                            ${enabled ? '' : 'disabled'}>${canUse ? 'Use' : 'Used'}</button>
                    </li>`;
                } else {
                    abilitiesHtml += `<li><span class="ability-name" data-description="${description}" data-timing="${timing}" data-frequency="${frequency}">${escapeHtml(ability.name)}</span></li>`;
                }
            });
            abilitiesHtml += '</ul>';
        }

        const keywords = (unit.keywords || []).map(escapeHtml).join(', ');
        const bg = unit.imageUrl
            ? `style="background-image:url('${escapeHtml(unit.imageUrl)}'); background-position: center ${unit.backgroundPosition ?? 50}%;"`
            : '';

        const summary = document.createElement('summary');
        summary.className = 'unit-card-summary';
        summary.innerHTML = `
            <div class="unit-header" ${bg}>
                <div class="unit-header-content">
                    <h3>${escapeHtml(unit.name)}</h3>
                    <div class="stats-container">${statsHtml}</div>
                </div>
                <span class="unit-fold-hint" aria-hidden="true"></span>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'unit-content';
        content.innerHTML = `
            ${weaponsHtml}
            ${abilitiesHtml}
            ${keywords ? `<h4 class="card-section-header">Keywords</h4><p class="keywords-list">${keywords}</p>` : ''}
        `;

        content.querySelectorAll('.ability-activate-btn').forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const abilityName = button.dataset.abilityName;
                const ability = unit.abilities.find((a) => a.name === abilityName);
                if (ability) activateAbility(side, ability, unit);
            });
        });

        fold.appendChild(summary);
        fold.appendChild(content);
        card.appendChild(fold);
        setupTooltips(card);
        return card;
    }

    function renderSideUnits(side) {
        const container = document.getElementById(`side-units-${side.id}`);
        if (!container) return;
        container.innerHTML = '';
        if (!side.factionData?.units?.length) {
            container.innerHTML = '<p>No units loaded.</p>';
            return;
        }
        side.factionData.units.forEach((unit) => {
            container.appendChild(renderUnitCard(side, unit));
        });
        side.effectManager.updateEffectDisplay();
    }

    function onPhaseOrTurnChange(sides) {
        Object.values(sides).forEach((side) => {
            if (!side) return;
            side.effectManager.cleanupExpiredEffects();
            side.effectManager.updateEffectDisplay();
            renderSideUnits(side);
        });
        populateUnifiedPhaseRules(sides);
    }

    function onTurnChange(sides, endingSideId) {
        const ending = sides[endingSideId];
        if (ending) resetAbilityUsage(ending, 'per_turn');
        onPhaseOrTurnChange(sides);
    }

    // Wire modal close buttons once
    const cancelBtn = document.getElementById(targetingModalIds.cancel);
    const closeX = document.getElementById(targetingModalIds.closeX);
    if (cancelBtn) cancelBtn.addEventListener('click', closeTargetingModal);
    if (closeX) closeX.addEventListener('click', closeTargetingModal);
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById(targetingModalIds.modal)) {
            closeTargetingModal();
        }
    });

    return {
        prepareSide,
        populatePhaseRules,
        populateUnifiedPhaseRules,
        renderSideUnits,
        highlightCurrentPhase,
        onPhaseOrTurnChange,
        onTurnChange,
        resetAbilityUsage,
        closeTargetingModal
    };
};
