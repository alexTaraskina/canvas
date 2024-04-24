document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let mouse = {
        x: 0,
        y: 0,
        w: 0,
        alt: false,
        shift: false,
        ctrl: false,
        buttonLastRaw: 0, // user modified value
        buttonRaw: 0,
        over: false,
        buttons: [1, 2, 4, 6, 5, 3], // masks for setting and clearing button raw bits;
    };

    function mouseMove(event) {
        // координаты курсора относительно элемента, запускающего событие
        mouse.x = event.offsetX;
        mouse.y = event.offsetY;

        if (mouse.x === undefined) {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        }

        // нажата ли кнопка
        mouse.alt = event.altKey;
        mouse.shift = event.shiftKey;
        mouse.ctrl = event.ctrlKey;

        if (event.type === "mousedown" || event.type === "touchend") {
            event.preventDefault();
            // event.which - число, представляющее нажатую клавишу:
            // 0: Клавиша не нажата
            // 1: Левая клавиша
            // 2: Средняя клавиша
            // 3: Правая клавиша
            mouse.buttonRaw = mouse.buttonRaw | mouse.buttons[event.which - 1];
        } else if (event.type === "mouseup" || event.type === "touchstart") {
            mouse.buttonRaw &= mouse.buttons[event.which + 2];
        } else if (event.type === "mouseout") {
            mouse.buttonRaw = 0;
            mouse.over = false;
        } else if (event.type === "mouseover") {
            mouse.over = true;
        } else if (event.type === "mousewheel") {
            event.preventDefault()
            mouse.w = event.wheelDelta;
        } else if (event.type === "DOMMouseScroll") {
            mouse.w = -event.detail;
        }
    }

    function setupMouse(e) {
        e.addEventListener('mousemove', mouseMove);
        e.addEventListener('mousedown', mouseMove);
        e.addEventListener('mouseup', mouseMove);
        e.addEventListener('mouseout', mouseMove);
        e.addEventListener('mouseover', mouseMove);
        e.addEventListener('mousewheel', mouseMove);
        e.addEventListener('DOMMouseScroll', mouseMove); // firefox
        e.addEventListener('touchstart', mouseMove);
        e.addEventListener('touchend', mouseMove);

        e.addEventListener("contextmenu", function (e) {
            e.preventDefault();
        }, false);
    }

    setupMouse(canvas);

    let displayTransform = {
        x: 0,
        y: 0,
        ox: 0,
        oy: 0,
        scale: 1,
        rotate: 0,
        cx: 0, 
        cy: 0,
        cox: 0,
        coy: 0,
        cscale: 1,
        crotate: 0,
        dx: 0,
        dy: 0,
        dox: 0,
        doy: 0,
        dscale: 1,
        drotate: 0,
        drag: 0.1, 
        accel: 0.7,
        matrix: [0, 0, 0, 0, 0, 0],
        invMatrix: [0, 0, 0, 0, 0, 0],
        mouseX: 0,
        mouseY: 0,
        ctx: ctx,
        setTransform: function () {
            let m = this.matrix;
            let i = 0;
            this.ctx.setTransform(m[i++], m[i++], m[i++], m[i++], m[i++], m[i++]);
        },
        setHome: function () {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        },
        update: function () {
            // smooth all movement out. drag and accel control how this moves
            // acceleration 
            this.dx += (this.x - this.cx) * this.accel;
            this.dy += (this.y - this.cy) * this.accel;
            this.dox += (this.ox - this.cox) * this.accel;
            this.doy += (this.oy - this.coy) * this.accel;
            this.dscale += (this.scale - this.cscale) * this.accel;
            this.drotate += (this.rotate - this.crotate) * this.accel;
            // drag
            this.dx *= this.drag;
            this.dy *= this.drag;
            this.dox *= this.drag;
            this.doy *= this.drag;
            this.dscale *= this.drag;
            this.drotate *= this.drag;
            // set the chase values. Chase chases the requiered values
            this.cx += this.dx;
            this.cy += this.dy;
            this.cox += this.dox;
            this.coy += this.doy;
            this.cscale += this.dscale;
            this.crotate += this.drotate;

            // create the display matrix
            this.matrix[0] = Math.cos(this.crotate) * this.cscale;
            this.matrix[1] = Math.sin(this.crotate) * this.cscale;
            this.matrix[2] = - this.matrix[1];
            this.matrix[3] = this.matrix[0];

            // set the coords relative to the origin
            this.matrix[4] = -(this.cx * this.matrix[0] + this.cy * this.matrix[2]) + this.cox;
            this.matrix[5] = -(this.cx * this.matrix[1] + this.cy * this.matrix[3]) + this.coy;


            // create invers matrix
            let det = (this.matrix[0] * this.matrix[3] - this.matrix[1] * this.matrix[2]);
            this.invMatrix[0] = this.matrix[3] / det;
            this.invMatrix[1] = - this.matrix[1] / det;
            this.invMatrix[2] = - this.matrix[2] / det;
            this.invMatrix[3] = this.matrix[0] / det;

            // check for mouse. Do controls and get real position of mouse.
            if (mouse !== undefined) {  // if there is a mouse get the real cavas coordinates of the mouse
                if (mouse.oldX !== undefined && (mouse.buttonRaw & 1) === 1) { // check if panning (middle button)
                    let mdx = mouse.x - mouse.oldX; // get the mouse movement
                    let mdy = mouse.y - mouse.oldY;
                    // get the movement in real space
                    let mrx = (mdx * this.invMatrix[0] + mdy * this.invMatrix[2]);
                    let mry = (mdx * this.invMatrix[1] + mdy * this.invMatrix[3]);
                    this.x -= mrx;
                    this.y -= mry;
                }
                // do the zoom with mouse wheel
                if (mouse.w !== undefined && mouse.w !== 0) {
                    this.ox = mouse.x;
                    this.oy = mouse.y;
                    this.x = this.mouseX;
                    this.y = this.mouseY;
                    /* Special note from answer */
                    // comment out the following is you change drag and accel
                    // and the zoom does not feel right (lagging and not 
                    // zooming around the mouse 
                    /*
                    this.cox = mouse.x;
                    this.coy = mouse.y;
                    this.cx = this.mouseX;
                    this.cy = this.mouseY;
                    */
                    if (mouse.w > 0) { // zoom in
                        this.scale *= 1.1;
                        mouse.w -= 20;
                        if (mouse.w < 0) {
                            mouse.w = 0;
                        }
                    }
                    if (mouse.w < 0) { // zoom out
                        this.scale *= 1 / 1.1;
                        mouse.w += 20;
                        if (mouse.w > 0) {
                            mouse.w = 0;
                        }
                    }

                }
                // get the real mouse position 
                let screenX = (mouse.x - this.cox);
                let screenY = (mouse.y - this.coy);
                this.mouseX = this.cx + (screenX * this.invMatrix[0] + screenY * this.invMatrix[2]);
                this.mouseY = this.cy + (screenX * this.invMatrix[1] + screenY * this.invMatrix[3]);
                mouse.rx = this.mouseX;  // add the coordinates to the mouse. r is for real
                mouse.ry = this.mouseY;
                // save old mouse position
                mouse.oldX = mouse.x;
                mouse.oldY = mouse.y;
            }

        }
    }

    let img = new Image();
    img.src = "shema.svg";
    ctx.drawImage(img,0,0);

    let timer = 0;

    function update() {
        timer += 1;
        displayTransform.update();
        displayTransform.setHome();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (img.complete) {
            displayTransform.setTransform();
            ctx.drawImage(img, 0, 0);
        } else {
            displayTransform.setTransform();

        }
        if (mouse.buttonRaw === 4) {
            displayTransform.x = 0;
            displayTransform.y = 0;
            displayTransform.scale = 1;
            displayTransform.rotate = 0;
            displayTransform.ox = 0;
            displayTransform.oy = 0;
        }
        requestAnimationFrame(update);
    }

    update();
})
