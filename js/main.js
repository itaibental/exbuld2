const App = {
    activeFormatInput: null, // Track which input is being edited

    init: function() {
        UI.initElements();
        UI.renderPartSelector();
        UI.renderTabs();
        UI.updateStats();
        this.onPartSelectChange();
        Utils.setupResizers();
        this.setupTextFormatting(); // Initialize Formatting Tooltip
        
        // Confirm Modal Handler
        const confirmBtn = document.getElementById('btnConfirmYes');
        if(confirmBtn) {
            confirmBtn.onclick = function() {
                if (UI.confirmCallback) UI.confirmCallback();
                UI.closeModal();
            };
        }
    },

    // --- Text Formatting Logic ---
    setupTextFormatting: function() {
        const tooltip = document.getElementById('textFormatTooltip');
        
        // Hide tooltip on clicking anywhere else
        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('#textFormatTooltip')) return; // Allow clicking buttons
            tooltip.style.display = 'none';
        });

        // Listen for selection in inputs
        document.addEventListener('mouseup', (e) => {
            const target = e.target;
            // Check if target is a text input/textarea in the editor panel OR the new preview instructions
            if ((target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.type === 'text')) && 
                (target.closest('#rightPanel') || target.id === 'previewPartInstructions')) {
                
                const start = target.selectionStart;
                const end = target.selectionEnd;

                if (start !== end) {
                    this.activeFormatInput = target;
                    // Position tooltip
                    tooltip.style.left = `${e.clientX - 40}px`;
                    tooltip.style.top = `${e.clientY - 50}px`;
                    tooltip.style.display = 'block';
                }
            }
        });
    },

    applyFormat: function(tag) {
        if (!this.activeFormatInput) return;
        
        const el = this.activeFormatInput;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = el.value;
        const selectedText = text.substring(start, end);
        
        if (!selectedText) return;

        const newText = text.substring(0, start) + `<${tag}>${selectedText}</${tag}>` + text.substring(end);
        el.value = newText;

        // Trigger input event to update previews
        el.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('textFormatTooltip').style.display = 'none';
    },

    // --- Part Management Handlers ---
    onPartSelectChange: function() {
        const selectedPartId = UI.elements.qPart.value;
        const part = ExamState.parts.find(p => p.id === selectedPartId);
        if (part) {
            UI.elements.partNameInput.value = part.name;
            UI.elements.partNameLabel.textContent = part.name;
            
            // Sync both inputs
            const instructions = ExamState.instructions.parts[selectedPartId] || '';
            UI.elements.partInstructions.value = instructions;
            
            this.setTab(selectedPartId);
        }
    },

    setTab: function(partId) {
        ExamState.currentTab = partId;
        UI.renderTabs();
        
        // Sync Inputs for the new tab
        const instructions = ExamState.instructions.parts[partId] || '';
        if(UI.elements.partInstructions) UI.elements.partInstructions.value = instructions;
        
        // Update the middle column input via UI method
        UI.updatePartInstructionsInput(instructions);

        if(UI.elements.qPart.value !== partId) {
            UI.elements.qPart.value = partId;
            // No need to call onPartSelectChange here to avoid loops, just update text inputs if needed
            const part = ExamState.parts.find(p => p.id === partId);
            if(part) {
                UI.elements.partNameInput.value = part.name;
                UI.elements.partNameLabel.textContent = part.name;
            }
        }
        UI.renderPreview();
    },

    addPart: function() {
        const nextIdx = ExamState.parts.length;
        let suffix = "";
        if (nextIdx < ExamState.partNamesList.length) suffix = ExamState.partNamesList[nextIdx];
        else suffix = (nextIdx + 1).toString();
        
        const newId = ExamState.getNextPartId();
        const newName = "חלק " + suffix;
        
        ExamState.addPart({ id: newId, name: newName });
        UI.renderPartSelector();
        UI.renderTabs();
        UI.updateStats();
        
        UI.elements.qPart.value = newId;
        this.onPartSelectChange();
        UI.showToast(`חלק חדש נוסף: ${newName}`);
    },

    removePart: function() {
        if (ExamState.parts.length <= 1) {
            UI.showToast('חייב להישאר לפחות חלק אחד בבחינה.', 'error');
            return;
        }
        const partIdToRemove = UI.elements.qPart.value;
        const partName = ExamState.parts.find(p => p.id === partIdToRemove).name;
        
        UI.showConfirm('מחיקת חלק', `האם למחוק את "${partName}"? השאלות בחלק זה יימחקו.`, () => {
            ExamState.removePart(partIdToRemove);
            if (ExamState.parts.length > 0) ExamState.currentTab = ExamState.parts[0].id;
            
            UI.renderPartSelector();
            UI.renderTabs();
            UI.updateStats();
            this.onPartSelectChange();
            UI.renderPreview();
            UI.showToast(`החלק "${partName}" נמחק`);
        });
    },

    updatePartName: function() {
        ExamState.updatePartName(UI.elements.qPart.value, UI.elements.partNameInput.value);
        UI.elements.partNameLabel.textContent = UI.elements.partNameInput.value;
        UI.renderTabs();
        UI.renderPartSelector();
        UI.updateStats();
    },

    // Updated Handler for Right Column Input
    savePartInstructions: function() {
        const val = UI.elements.partInstructions.value;
        ExamState.instructions.parts[UI.elements.qPart.value] = val;
        // Sync Middle Column
        UI.updatePartInstructionsInput(val);
    },

    // New Handler for Middle Column Input
    updatePartInstructionsFromPreview: function(value) {
        ExamState.instructions.parts[ExamState.currentTab] = value;
        // Sync Right Column
        if(UI.elements.partInstructions) UI.elements.partInstructions.value = value;
    },

    // --- Question Management Handlers (UNCHANGED) ---
    addQuestion: function() {
        const text = UI.elements.qText.value.trim();
        const modelAnswer = UI.elements.qModelAnswer.value.trim();
        const part = UI.elements.qPart.value;
        const videoUrl = UI.elements.qVideo.value.trim();
        const imageUrl = UI.elements.qImage.value.trim();
        let points = parseInt(UI.elements.qPoints.value) || 0;

        if (!text) {
            UI.showToast('אנא הכנס תוכן לשאלה', 'error');
            return;
        }

        if (ExamState.tempSubQuestions.length > 0) {
            points = ExamState.tempSubQuestions.reduce((acc, curr) => acc + (curr.points || 0), 0);
        }

        const question = {
            id: Date.now(),
            part, points, text, modelAnswer, videoUrl, imageUrl,
            subQuestions: [...ExamState.tempSubQuestions]
        };

        ExamState.addQuestion(question);
        
        // Reset Form
        UI.elements.qText.value = '';
        UI.elements.qModelAnswer.value = '';
        UI.elements.qPoints.value = '10';
        UI.elements.qVideo.value = '';
        UI.elements.qImage.value = '';
        UI.elements.qText.focus();
        ExamState.tempSubQuestions = [];
        UI.renderSubQuestionInputs();

        UI.updateStats();
        UI.renderPreview();
        UI.showToast('השאלה נוספה בהצלחה');
    },

    deleteQuestion: function(id) {
        UI.showConfirm('מחיקת שאלה', 'האם אתה בטוח שברצונך למחוק שאלה זו?', () => {
            ExamState.removeQuestion(id);
            UI.updateStats();
            UI.renderPreview();
            UI.showToast('השאלה נמחקה');
        });
    },

    // --- Sub Question Handlers (UNCHANGED) ---
    addSubQuestionField: function() {
        const id = Date.now() + Math.random();
        ExamState.tempSubQuestions.push({ id, text: '', points: 5, modelAnswer: '' });
        UI.renderSubQuestionInputs();
    },

    removeSubQuestionField: function(id) {
        ExamState.tempSubQuestions = ExamState.tempSubQuestions.filter(sq => sq.id !== id);
        UI.renderSubQuestionInputs();
    },

    updateSubQuestionData: function(id, field, value) {
        const sq = ExamState.tempSubQuestions.find(s => s.id === id);
        if (sq) {
            sq[field] = value;
            if (field === 'points') UI.renderSubQuestionInputs(false);
        }
    },

    // --- General Settings Handlers (UNCHANGED) ---
    updateExamTitle: function() {
        ExamState.examTitle = UI.elements.examTitleInput.value.trim() || 'מבחן בגרות';
        UI.elements.previewExamTitle.textContent = ExamState.examTitle;
    },

    updateInstructionsPreview: function() {
        const text = UI.elements.examInstructions.value;
        ExamState.instructions.general = text;
        if (text.trim()) {
            UI.elements.previewInstructionsBox.style.display = 'block';
            UI.elements.previewInstructionsBox.textContent = text;
        } else {
            UI.elements.previewInstructionsBox.style.display = 'none';
        }
    },

    updateFilenamePreview: function() {
        ExamState.studentName = UI.elements.studentNameInput.value.trim();
        const name = ExamState.studentName || 'תלמיד';
        UI.elements.filenamePreview.textContent = `${name} - מבחן.html`;
    },

    handleLogoUpload: function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                ExamState.logoData = e.target.result;
                UI.elements.previewLogo.src = ExamState.logoData;
                UI.elements.previewLogo.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    },

    handleSolutionUpload: function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                ExamState.solutionDataUrl = e.target.result;
                UI.showToast('קובץ הפתרון נטען בהצלחה');
            };
            reader.readAsDataURL(file);
        }
    }
};

// === START APP ===
window.onload = function() {
    App.init();
};
