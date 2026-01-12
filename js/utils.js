const Utils = {
    getVideoEmbedUrl: function(url) {
        if (!url) return null;
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
        const iframeMatch = url.match(/src=["'](.*?)["']/);
        const link = iframeMatch ? iframeMatch[1] : url;
        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?"]*).*/;
        const ytMatch = link.match(ytRegExp);
        if (ytMatch && ytMatch[2].length === 11) {
            return `https://www.youtube-nocookie.com/embed/${ytMatch[2]}?rel=0&modestbranding=1&showinfo=0`;
        }
        return null;
    },

    getImageSrc: function(url) {
        if (!url) return null;
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
        }
        return url;
    },

    simpleHash: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return hash.toString();
    },

    setupResizers: function() {
        // Setup Right Resizer
        const resizerRight = document.getElementById('dragHandleRight');
        const rightCol = document.getElementById('rightPanel');
        resizerRight.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.style.cursor = 'col-resize';
            resizerRight.classList.add('resizing');
            const onMove = (e) => {
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth > 200 && newWidth < window.innerWidth * 0.6) {
                    rightCol.style.width = newWidth + 'px';
                    rightCol.style.flex = 'none';
                }
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = 'default';
                resizerRight.classList.remove('resizing');
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // Setup Left Resizer
        const resizerLeft = document.getElementById('dragHandleLeft');
        const leftCol = document.getElementById('leftPanel');
        resizerLeft.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.style.cursor = 'col-resize';
            resizerLeft.classList.add('resizing');
            const onMove = (e) => {
                const newWidth = e.clientX;
                if (newWidth > 150 && newWidth < window.innerWidth * 0.4) {
                    leftCol.style.width = newWidth + 'px';
                    leftCol.style.flex = 'none';
                }
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = 'default';
                resizerLeft.classList.remove('resizing');
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
};
