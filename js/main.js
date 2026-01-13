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

    // --- Question Management: Edit Feature ---
    editQuestion: function(id) {
        const q = ExamState.questions.find(q => q.id === id);
        if (!q) return;

        // 1. טעינת הנתונים לשדות העריכה
        UI.elements.qText.value = q.text;
        UI.elements.qPoints.value = q.points;
        UI.elements.qModelAnswer.value = q.modelAnswer || '';
        UI.elements.qVideo.value = q.videoUrl || '';
        UI.elements.qImage.value = q.imageUrl || '';
        
        // 2. טעינת סעיפים אם יש
        ExamState.tempSubQuestions = q.subQuestions ? [...q.subQuestions] : [];
        UI.renderSubQuestionInputs();

        // 3. מעבר ללשונית המתאימה
        if (q.part !== ExamState.currentTab) {
            this.setTab(q.part);
        }
        UI.elements.qPart.value = q.part; // עדכון ה-Select

        // 4. הסרת השאלה המקורית (כדי שהמשתמש ילחץ "הוסף" ויצור גרסה מעודכנת)
        ExamState.removeQuestion(id);
        UI.updateStats();
        UI.renderPreview();
        
        // 5. גלילה למעלה לאזור העריכה והודעה למשתמש
        const rightPanel = document.getElementById('rightPanel');
        if(rightPanel) rightPanel.scrollTop = 0;
        UI.elements.qText.focus();
        UI.showToast('השאלה נטענה לעריכה. בצע שינויים ולחץ "הוסף שאלה" לשמירה.');
    },

    // --- Text Formatting Logic (Updated placement) ---
    setupTextFormatting: function() {
        const tooltip = document.getElementById('textFormatTooltip');
        
        // Hide tooltip on clicking anywhere else
        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('#textFormatTooltip')) return; 
            // אל תסתיר אם לוחצים בתוך תיבת טקסט
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            tooltip.style.display = 'none';
        });

        // Listen for interaction in inputs
        const handleInputInteraction = (e) => {
            const target = e.target;
            if ((target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.type === 'text')) && 
                (target.closest('#rightPanel') || target.id === 'previewPartInstructions')) {
                
                this.activeFormatInput = target;
                
                // חישוב מיקום: הצמדה לחלק העליון של התיבה
                const rect = target.getBoundingClientRect();
                tooltip.style.left = `${rect.left}px`;
                tooltip.style.top = `${rect.top - 40}px`; // 40px מעל התיבה
                tooltip.style.display = 'flex'; // Use flex for layout
            }
        };

        // הצגת הסרגל כשנכנסים לפוקוס או בוחרים טקסט
        document.addEventListener('focusin', handleInputInteraction);
        document.addEventListener('mouseup', handleInputInteraction);
    },

    applyFormat: function(tag) {
        if (!this.activeFormatInput) return;
        
        const el = this.activeFormatInput;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = el.value;
        const selectedText = text.substring(start, end);
        
        if (!selectedText) {
            UI.showToast('אנא סמן טקסט לעיצוב', 'error');
            return;
        }

        const newText = text.substring(0, start) + `<${tag}>${selectedText}</${tag}>` + text.substring(end);
        el.value = newText;

        // Trigger input event to update previews
        el.dispatchEvent(new Event('input', { bubbles: true }));
        
        // שומר על הפוקוס והמיקום
        el.focus();
        el.setSelectionRange(start, end + tag.length * 2 + 5); // Approximate selection fix
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

    savePartInstructions: function() {
        const val = UI.elements.partInstructions.value;
        ExamState.instructions.parts[UI.elements.qPart.value] = val;
        UI.updatePartInstructionsInput(val);
    },

    updatePartInstructionsFromPreview: function(value) {
        ExamState.instructions.parts[ExamState.currentTab] = value;
        if(UI.elements.partInstructions) UI.elements.partInstructions.value = value;
    },

    // --- Question Management Handlers ---
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

    // --- Sub Question Handlers ---
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

    // --- General Settings Handlers ---
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
