/**
 * Generator (Main Orchestrator)
 * רכיב זה מחבר בין הנתונים (ExamState) לבין הבנאים (Builders)
 * ומטפל בפעולת ההורדה (Download) עצמה.
 */
const Generator = {
    generateAndDownload: function() {
        // איסוף כל הנתונים הדרושים
        const name = ExamState.studentName || 'תלמיד';
        const duration = UI.elements.examDurationInput.value || 90;
        const unlockCodePlain = UI.elements.unlockCodeInput.value || '1234';
        const unlockCodeHash = Utils.simpleHash(unlockCodePlain);
        const teacherEmail = UI.elements.teacherEmailInput.value.trim();
        const driveLink = UI.elements.driveFolderInput.value.trim();

        // יצירת אובייקט הנתונים לשחזור (זהה ל-saveProject)
        const projectData = {
            state: ExamState,
            meta: {
                duration: UI.elements.examDurationInput.value,
                unlockCode: UI.elements.unlockCodeInput.value,
                teacherEmail: UI.elements.teacherEmailInput.value,
                driveLink: UI.elements.driveFolderInput.value,
                examTitle: UI.elements.examTitleInput.value,
                generalInstructions: UI.elements.examInstructions.value
            },
            timestamp: Date.now()
        };

        // קריאה ל-Builder החיצוני (generator-html.js)
        const htmlContent = HTMLBuilder.build(
            name, 
            ExamState.questions, 
            ExamState.instructions, 
            ExamState.examTitle, 
            ExamState.logoData, 
            ExamState.solutionDataUrl, 
            duration, 
            unlockCodeHash, 
            ExamState.parts, 
            teacherEmail, 
            driveLink, 
            projectData
        );
        
        // יצירת הקובץ והורדה
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name} - מבחן.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        UI.showToast('קובץ המבחן הורד בהצלחה!');
    },

    generateAndDownloadDocx: function() {
        // קריאה ל-Builder החיצוני (generator-docx.js)
        const content = DocxBuilder.build(
            ExamState.examTitle,
            ExamState.instructions,
            ExamState.parts,
            ExamState.questions,
            ExamState.studentName,
            ExamState.logoData
        );

        // יצירת הקובץ והורדה
        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${ExamState.studentName || 'מבחן'}.doc`; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
