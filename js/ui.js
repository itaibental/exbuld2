const UI = {
    init() {
        this.initResizer();
        this.initInstructionSync();
    },
    initResizer() {
        const resizer = document.getElementById('editor-resizer');
        const sidebar = document.querySelector('.sidebar');
        let isResizing = false;
        if (!resizer) return;
        resizer.addEventListener('mousedown', () => isResizing = true);
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const width = window.innerWidth - e.clientX;
            if (width > 250 && width < 600) sidebar.style.width = width + 'px';
        });
        document.addEventListener('mouseup', () => isResizing = false);
    },
    initInstructionSync() {
        document.getElementById('general-instructions-input')?.addEventListener('input', (e) => {
            ExamState.instructions.general = e.target.value;
        });
    }
};