const App = {
    activeFormatInput: null, 
    init: function() {
        UI.initElements();
        UI.renderPartSelector();
        UI.renderTabs();
        UI.updateStats();
        this.onPartSelectChange();
        Utils.setupResizers();
        this.setupTextFormatting();
        const confirmBtn = document.getElementById('btnConfirmYes');
        if(confirmBtn) {
            confirmBtn.onclick = function() {
                if (UI.confirmCallback) UI.confirmCallback();
                UI.closeModal();
            };
        }
    },
    saveProject: function() {
        try {
            const projectData = {
                state: ExamState,
                meta: {
                    duration: UI.elements.examDurationInput?.value || 90,
                    unlockCode: UI.elements.unlockCodeInput?.value || '',
                    teacherEmail: UI.elements.teacherEmailInput?.value || '',
                    driveLink: UI.elements.driveFolderInput?.value || '',
                    examTitle: UI.elements.examTitleInput?.value || '',
                    generalInstructions: UI.elements.examInstructions?.value || ''
                },
                timestamp: Date.now()
            };
            const dataStr = JSON.stringify(projectData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `exam-draft-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            UI.showToast('טיוטת המבחן נשמרה בהצלחה!');
        } catch (e) {
            console.error("Save Error:", e);
            UI.showToast('שגיאה בשמירת הטיוטה: ' + e.message, 'error');
        }
    },
    handleProjectLoad: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let loaded;
                if (file.name.endsWith('.html')) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(e.target.result, 'text/html');
                    const scriptTag = doc.getElementById('exam-engine-data');
                    if (scriptTag && scriptTag.textContent) {
                        loaded = JSON.parse(scriptTag.textContent);
                    } else {
                        throw new Error("לא נמצא מידע פרויקט בקובץ ה-HTML זה.");
                    }
                } else {
                    loaded = JSON.parse(e.target.result);
                }
                if (!loaded.state || !loaded.state.questions) {
                    throw new Error("קובץ לא תקין");
                }
                ExamState.questions = loaded.state.questions;
                ExamState.parts = loaded.state.parts;
                ExamState.currentTab = loaded.state.parts[0]?.id || 'A';
                ExamState.studentName = loaded.state.studentName || '';
                ExamState.examTitle = loaded.state.examTitle || 'מבחן בגרות';
                ExamState.logoData = loaded.state.logoData;
                ExamState.solutionDataUrl = loaded.state.solutionDataUrl;
                ExamState.instructions = loaded.state.instructions;
                if (loaded.meta) {
                    if (UI.elements.examDurationInput) UI.elements.examDurationInput.value = loaded.meta.duration || 90;
                    if (UI.elements.unlockCodeInput) UI.elements.unlockCodeInput.value = loaded.meta.unlockCode || '';
                    if (UI.elements.teacherEmailInput) UI.elements.teacherEmailInput.value = loaded.meta.teacherEmail || '';
                    if (UI.elements.driveFolderInput) UI.elements.driveFolderInput.value = loaded.meta.driveLink || '';
                    if (UI.elements.examTitleInput) UI.elements.examTitleInput.value = loaded.meta.examTitle || '';
                    if (UI.elements.examInstructions) UI.elements.examInstructions.value = loaded.meta.generalInstructions || '';
                }
                if (ExamState.logoData && UI.elements.previewLogo) {
                    UI.elements.previewLogo.src = ExamState.logoData;
                    UI.elements.previewLogo.style.display = 'block';
                }
                if (UI.elements.previewExamTitle) UI.elements.previewExamTitle.textContent = ExamState.examTitle;
                App.updateInstructionsPreview(); 
                UI.renderPartSelector();
                UI.renderTabs();
                UI.updateStats();
                App.setTab(ExamState.currentTab);
                UI.showToast('המבחן נטען בהצלחה!');
            } catch (err) {
                console.error(err);
                UI.showToast('שגיאה בטעינת הקובץ: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; 
    },
    editQuestion: function(id) {
        const q = ExamState.questions.find(q => q.id === id);
        if (!q) return;
        UI.elements.qText.value = q.text;
        UI.elements.qPoints.value = q.points;
        UI.elements.qModelAnswer.value = q.modelAnswer || '';
        UI.elements.qVideo.value = q.videoUrl || '';
        UI.elements.qImage.value = q.imageUrl || '';
        if (q.videoOptions) {
            UI.elements.vidOptControls.checked = q.videoOptions.showControls !== false; 
            UI.elements.vidOptBranding.checked = q.videoOptions.modestBranding !== false; 
            UI.elements.vidOptRelated.checked = q.videoOptions.showRelated === true; 
        } else {
            UI.elements.vidOptControls.checked = true;
            UI.elements.vidOptBranding.checked = true;
            UI.elements.vidOptRelated.checked = false;
        }
        ExamState.tempSubQuestions = q.subQuestions ? [...q.subQuestions] : [];
        UI.renderSubQuestionInputs();
        if (q.part !== ExamState.currentTab) {
            this.setTab(q.part);
        }
        UI.elements.qPart.value = q.part; 
        ExamState.removeQuestion(id);
        UI.updateStats();
        UI.renderPreview();
        const rightPanel = document.getElementById('rightPanel');
        if(rightPanel) rightPanel.scrollTop = 0;
        UI.elements.qText.focus();
        UI.showToast('השאלה נטענה לעריכה.');
    },
    setupTextFormatting: function() {
        const tooltip = document.getElementById('textFormatTooltip');
        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('#textFormatTooltip')) return; 
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            tooltip.style.display = 'none';
        });
        const handleInputInteraction = (e) => {
            const target = e.target;
            if ((target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.type === 'text')) && 
                (target.closest('#rightPanel') || target.id === 'previewPartInstructions')) {
                this.activeFormatInput = target;
                const rect = target.getBoundingClientRect();
                tooltip.style.left = `${rect.left}px`;
                tooltip.style.top = `${rect.top - 40}px`; 
                tooltip.style.display = 'flex'; 
            }
        };
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
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        el.setSelectionRange(start, end + tag.length * 2 + 5); 
    },
    onPartSelectChange: function() {
        const selectedPartId = UI.elements.qPart.value;
        const part = ExamState.parts.find(p => p.id === selectedPartId);
        if (part) {
            UI.elements.partNameInput.value = part.name;
            UI.elements.partNameLabel.textContent = part.name;
            const instructions = ExamState.instructions.parts[selectedPartId] || '';
            UI.elements.partInstructions.value = instructions;
            this.setTab(selectedPartId);
        }
    },
    setTab: function(partId) {
        ExamState.currentTab = partId;
        UI.renderTabs();
        const instructions = ExamState.instructions.parts[partId] || '';
        if(UI.elements.partInstructions) UI.elements.partInstructions.value = instructions;
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
    addQuestion: function() {
        const text = UI.elements.qText.value.trim();
        const modelAnswer = UI.elements.qModelAnswer.value.trim();
        const part = UI.elements.qPart.value;
        const videoUrl = UI.elements.qVideo.value.trim();
        const imageUrl = UI.elements.qImage.value.trim();
        let points = parseInt(UI.elements.qPoints.value) || 0;
        const videoOptions = {
            showControls: UI.elements.vidOptControls.checked,
            modestBranding: UI.elements.vidOptBranding.checked,
            showRelated: UI.elements.vidOptRelated.checked
        };
        if (!text) {
            UI.showToast('אנא הכנס תוכן לשאלה', 'error');
            return;
        }
        if (ExamState.tempSubQuestions.length > 0) {
            points = ExamState.tempSubQuestions.reduce((acc, curr) => acc + (curr.points || 0), 0);
        }
        const question = {
            id: Date.now(),
            part, points, text, modelAnswer, videoUrl, imageUrl, videoOptions,
            subQuestions: [...ExamState.tempSubQuestions]
        };
        ExamState.addQuestion(question);
        UI.elements.qText.value = '';
        UI.elements.qModelAnswer.value = '';
        UI.elements.qPoints.value = '10';
        UI.elements.qVideo.value = '';
        UI.elements.qImage.value = '';
        UI.elements.vidOptControls.checked = true;
        UI.elements.vidOptBranding.checked = true;
        UI.elements.vidOptRelated.checked = false;
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
window.onload = function() {
    App.init();
};
