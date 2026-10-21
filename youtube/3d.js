document.addEventListener("DOMContentLoaded", () => {

    console.log("3D DIGITAL UNIVERSE STARTED");

    const canvas =
        document.getElementById("webgl");

    const loading =
        document.getElementById("loading");

    const loadingProgress =
        document.getElementById("loadingProgress");

    const counter =
        document.getElementById("counter");

    const logoName =
        document.getElementById("logoName");

    const logoSub =
        document.getElementById("logoSub");

    const eyebrow =
        document.getElementById("eyebrow");

    const heroTitle =
        document.getElementById("heroTitle");

    const heroDescription =
        document.getElementById("heroDescription");

    const scrollProgress =
        document.getElementById("scrollProgress");

    const progressText =
        document.getElementById("progressText");

    const floatingMessage =
        document.getElementById("floatingMessage");

    const skipButton =
        document.getElementById("skipButton");

    const finalOverlay =
        document.getElementById("finalOverlay");


    // =====================================================
    // THREE SCENE
    // =====================================================

    const scene =
        new THREE.Scene();

    scene.background =
        new THREE.Color(0x020204);

    scene.fog =
        new THREE.FogExp2(
            0x020204,
            0.018
        );


    // =====================================================
    // CAMERA
    // =====================================================

    const camera =
        new THREE.PerspectiveCamera(
            58,
            window.innerWidth /
            window.innerHeight,
            0.1,
            1500
        );

    camera.position.set(
        0,
        0,
        18
    );


    // =====================================================
    // RENDERER
    // =====================================================

    const renderer =
        new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false
        });

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    // =====================================================
    // LIGHTING
    // =====================================================

    const ambient =
        new THREE.AmbientLight(
            0xffffff,
            .3
        );

    scene.add(ambient);


    const mainLight =
        new THREE.PointLight(
            0xffffff,
            5,
            80
        );

    mainLight.position.set(
        0,
        4,
        10
    );

    scene.add(mainLight);


    const sideLight =
        new THREE.PointLight(
            0x7777ff,
            4,
            70
        );

    sideLight.position.set(
        -12,
        2,
        -15
    );

    scene.add(sideLight);


    const secondLight =
        new THREE.PointLight(
            0xff4477,
            3,
            60
        );

    secondLight.position.set(
        12,
        -3,
        -25
    );

    scene.add(secondLight);


    // =====================================================
    // STAR FIELD
    // =====================================================

    const starGeometry =
        new THREE.BufferGeometry();

    const starCount = 5000;

    const starPositions =
        new Float32Array(
            starCount * 3
        );

    for (
        let i = 0;
        i < starCount * 3;
        i += 3
    ) {

        starPositions[i] =
            (Math.random() - .5) * 150;

        starPositions[i + 1] =
            (Math.random() - .5) * 90;

        starPositions[i + 2] =
            (Math.random() - .5) * 250;
    }

    starGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            starPositions,
            3
        )
    );


    const starMaterial =
        new THREE.PointsMaterial({
            color: 0xffffff,
            size: .035,
            transparent: true,
            opacity: .8
        });


    const stars =
        new THREE.Points(
            starGeometry,
            starMaterial
        );

    scene.add(stars);


    // =====================================================
    // DIGITAL GRID
    // =====================================================

    const grid =
        new THREE.GridHelper(
            100,
            100,
            0x555555,
            0x111111
        );

    grid.position.y = -5;

    scene.add(grid);


    // =====================================================
    // VERTICAL GRID
    // =====================================================

    const verticalGridGroup =
        new THREE.Group();

    for (
        let i = -20;
        i <= 20;
        i++
    ) {

        const geometry =
            new THREE.BufferGeometry();

        const points = [
            new THREE.Vector3(
                i * 2,
                -5,
                30
            ),

            new THREE.Vector3(
                i * 2,
                30,
                -180
            )
        ];

        geometry.setFromPoints(
            points
        );

        const material =
            new THREE.LineBasicMaterial({
                color: 0x222222,
                transparent: true,
                opacity: .35
            });

        const line =
            new THREE.Line(
                geometry,
                material
            );

        verticalGridGroup.add(
            line
        );
    }

    scene.add(
        verticalGridGroup
    );


    // =====================================================
    // LOGO TEXTURES
    // =====================================================

    function makeLogoTexture(
        type
    ) {

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width = 700;
        canvas.height = 700;

        const ctx =
            canvas.getContext("2d");

        ctx.clearRect(
            0,
            0,
            700,
            700
        );


        // YOUTUBE

        if (type === "YOUTUBE") {

            ctx.fillStyle =
                "#ff0000";

            roundRect(
                ctx,
                100,
                190,
                500,
                320,
                80
            );

            ctx.fill();

            ctx.fillStyle =
                "#ffffff";

            ctx.beginPath();

            ctx.moveTo(
                295,
                250
            );

            ctx.lineTo(
                295,
                450
            );

            ctx.lineTo(
                465,
                350
            );

            ctx.closePath();

            ctx.fill();
        }


        // INSTAGRAM

        if (type === "INSTAGRAM") {

            ctx.strokeStyle =
                "#ffffff";

            ctx.lineWidth = 45;

            roundRect(
                ctx,
                110,
                110,
                480,
                480,
                120
            );

            ctx.stroke();

            ctx.beginPath();

            ctx.arc(
                350,
                350,
                120,
                0,
                Math.PI * 2
            );

            ctx.stroke();

            ctx.fillStyle =
                "#ffffff";

            ctx.beginPath();

            ctx.arc(
                495,
                205,
                30,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        // CHATGPT

        if (type === "CHATGPT") {

            ctx.strokeStyle =
                "#ffffff";

            ctx.lineWidth = 32;

            ctx.lineJoin =
                "round";

            const radius = 190;

            ctx.beginPath();

            for (
                let i = 0;
                i < 6;
                i++
            ) {

                const angle =
                    -Math.PI / 2 +
                    i *
                    Math.PI /
                    3;

                const x =
                    350 +
                    Math.cos(angle) *
                    radius;

                const y =
                    350 +
                    Math.sin(angle) *
                    radius;

                if (i === 0) {
                    ctx.moveTo(
                        x,
                        y
                    );
                } else {
                    ctx.lineTo(
                        x,
                        y
                    );
                }
            }

            ctx.closePath();

            ctx.stroke();

            ctx.beginPath();

            ctx.arc(
                350,
                350,
                105,
                0,
                Math.PI * 2
            );

            ctx.stroke();
        }


        // FACEBOOK

        if (type === "FACEBOOK") {

            ctx.fillStyle =
                "#1877f2";

            ctx.beginPath();

            ctx.arc(
                350,
                350,
                230,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.fillStyle =
                "#ffffff";

            ctx.font =
                "bold 340px Arial";

            ctx.textAlign =
                "center";

            ctx.textBaseline =
                "middle";

            ctx.fillText(
                "f",
                365,
                395
            );
        }


        // SECRET

        if (type === "SECRET") {

            ctx.strokeStyle =
                "#ffffff";

            ctx.lineWidth = 22;

            ctx.beginPath();

            ctx.arc(
                350,
                350,
                190,
                0,
                Math.PI * 2
            );

            ctx.stroke();

            ctx.beginPath();

            ctx.moveTo(
                280,
                350
            );

            ctx.lineTo(
                420,
                350
            );

            ctx.moveTo(
                350,
                280
            );

            ctx.lineTo(
                350,
                420
            );

            ctx.stroke();
        }


        return new THREE.CanvasTexture(
            canvas
        );
    }


    function roundRect(
        ctx,
        x,
        y,
        width,
        height,
        radius
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x + radius,
            y
        );

        ctx.lineTo(
            x + width - radius,
            y
        );

        ctx.quadraticCurveTo(
            x + width,
            y,
            x + width,
            y + radius
        );

        ctx.lineTo(
            x + width,
            y + height - radius
        );

        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height
        );

        ctx.lineTo(
            x + radius,
            y + height
        );

        ctx.quadraticCurveTo(
            x,
            y + height,
            x,
            y + height - radius
        );

        ctx.lineTo(
            x,
            y + radius
        );

        ctx.quadraticCurveTo(
            x,
            y,
            x + radius,
            y
        );

        ctx.closePath();
    }


    // =====================================================
    // LOGO DATA
    // =====================================================

    const logoData = [

        {
            name: "YOUTUBE",
            sub: "VIDEO • CREATE • SHARE",
            title: "CONNECT",
            eyebrow: "THE DIGITAL WORLD",
            description:
                "Where ideas become moments and moments become memories."
        },

        {
            name: "INSTAGRAM",
            sub: "CAPTURE • CREATE • INSPIRE",
            title: "EXPRESS",
            eyebrow: "YOUR MOMENT",
            description:
                "Every frame has a story waiting to be discovered."
        },

        {
            name: "CHATGPT",
            sub: "THINK • CREATE • IMAGINE",
            title: "IMAGINE",
            eyebrow: "INTELLIGENCE",
            description:
                "Ideas move faster when imagination has no limits."
        },

        {
            name: "FACEBOOK",
            sub: "PEOPLE • STORIES • COMMUNITY",
            title: "TOGETHER",
            eyebrow: "ONE WORLD",
            description:
                "Millions of stories crossing paths every second."
        },

        {
            name: "SECRET",
            sub: "PRIVATE • UNKNOWN • NEXT",
            title: "DISCOVER",
            eyebrow: "BEYOND THE SCREEN",
            description:
                "There is something waiting on the other side."
        }

    ];


    // =====================================================
    // CREATE LOGOS
    // =====================================================

    const logoMeshes = [];

    logoData.forEach(
        (data, index) => {

            const geometry =
                new THREE.PlaneGeometry(
                    5,
                    5
                );

            const material =
                new THREE.MeshBasicMaterial({

                    map:
                        makeLogoTexture(
                            data.name
                        ),

                    transparent: true,

                    side:
                        THREE.DoubleSide,

                    depthWrite:
                        false,

                    opacity: 0
                });


            const mesh =
                new THREE.Mesh(
                    geometry,
                    material
                );


            mesh.position.z =
                -index * 32;


            mesh.position.x =
                index % 2 === 0
                    ? -5
                    : 5;


            mesh.position.y =
                index === 4
                    ? 0
                    : 1;


            mesh.rotation.y =
                index % 2 === 0
                    ? .35
                    : -.35;


            mesh.userData.index =
                index;


            scene.add(mesh);

            logoMeshes.push(
                mesh
            );
        }
    );


    // =====================================================
    // ENERGY RINGS
    // =====================================================

    const energyRings = [];

    for (
        let i = 0;
        i < 22;
        i++
    ) {

        const geometry =
            new THREE.TorusGeometry(
                3 + Math.random() * 5,
                .018,
                8,
                100
            );

        const material =
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: .12
            });


        const ring =
            new THREE.Mesh(
                geometry,
                material
            );


        ring.position.z =
            -i * 8;


        ring.rotation.x =
            Math.PI / 2;


        ring.rotation.z =
            Math.random() *
            Math.PI;


        scene.add(ring);

        energyRings.push(
            ring
        );
    }


    // =====================================================
    // FLOATING CUBES
    // =====================================================

    const cubes = [];

    for (
        let i = 0;
        i < 100;
        i++
    ) {

        const size =
            .05 +
            Math.random() * .3;


        const geometry =
            new THREE.BoxGeometry(
                size,
                size,
                size
            );


        const material =
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity:
                    .12 +
                    Math.random() * .35
            });


        const cube =
            new THREE.Mesh(
                geometry,
                material
            );


        cube.position.set(

            (Math.random() - .5) * 25,

            (Math.random() - .5) * 18,

            -Math.random() * 170

        );


        cube.rotation.set(

            Math.random() * 3,

            Math.random() * 3,

            Math.random() * 3

        );


        cube.userData.speed =
            .002 +
            Math.random() * .01;


        scene.add(cube);

        cubes.push(cube);
    }


    // =====================================================
    // PARTICLE TUNNEL
    // =====================================================

    const tunnelGroup =
        new THREE.Group();

    for (
        let i = 0;
        i < 300;
        i++
    ) {

        const geometry =
            new THREE.SphereGeometry(
                .015 +
                Math.random() * .045,
                5,
                5
            );


        const material =
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: .4
            });


        const particle =
            new THREE.Mesh(
                geometry,
                material
            );


        const angle =
            Math.random() *
            Math.PI *
            2;


        const radius =
            3 +
            Math.random() * 9;


        particle.position.x =
            Math.cos(angle) *
            radius;


        particle.position.y =
            Math.sin(angle) *
            radius;


        particle.position.z =
            -Math.random() * 180;


        tunnelGroup.add(
            particle
        );
    }

    scene.add(
        tunnelGroup
    );


    // =====================================================
    // PORTAL
    // =====================================================

    const portalGroup =
        new THREE.Group();

    portalGroup.position.z =
        -140;


    const portalOuter =
        new THREE.TorusGeometry(
            6,
            .08,
            16,
            120
        );


    const portalMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: .65
        });


    const portal =
        new THREE.Mesh(
            portalOuter,
            portalMaterial
        );


    portal.rotation.x =
        Math.PI / 2;


    portalGroup.add(
        portal
    );


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        const inner =
            new THREE.TorusGeometry(
                2 +
                i * .9,
                .025,
                8,
                100
            );


        const innerMaterial =
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: .2
            });


        const innerRing =
            new THREE.Mesh(
                inner,
                innerMaterial
            );


        innerRing.rotation.x =
            Math.PI / 2;


        portalGroup.add(
            innerRing
        );
    }


    scene.add(
        portalGroup
    );


    // =====================================================
    // SCROLL
    // =====================================================

    let targetScroll = 0;

    let currentScroll = 0;

    const maxScroll = 4.95;

    let finalTriggered = false;

    let lastWheel = 0;


    window.addEventListener(
        "wheel",
        event => {

            const now =
                performance.now();

            if (
                now - lastWheel <
                12
            ) {
                return;
            }

            lastWheel = now;


            targetScroll +=
                event.deltaY *
                .0025;


            targetScroll =
                THREE.MathUtils.clamp(
                    targetScroll,
                    0,
                    maxScroll
                );

        },
        {
            passive: true
        }
    );


    // =====================================================
    // TOUCH
    // =====================================================

    let touchStart = 0;


    window.addEventListener(
        "touchstart",
        event => {

            touchStart =
                event.touches[0].clientY;

        },
        {
            passive: true
        }
    );


    window.addEventListener(
        "touchmove",
        event => {

            const current =
                event.touches[0].clientY;


            targetScroll +=
                (touchStart -
                    current) *
                .006;


            targetScroll =
                THREE.MathUtils.clamp(
                    targetScroll,
                    0,
                    maxScroll
                );


            touchStart =
                current;

        },
        {
            passive: true
        }
    );


    // =====================================================
    // KEYBOARD
    // =====================================================

    window.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "ArrowDown"
            ) {

                targetScroll += .25;
            }


            if (
                event.key ===
                "ArrowUp"
            ) {

                targetScroll -= .25;
            }


            targetScroll =
                THREE.MathUtils.clamp(
                    targetScroll,
                    0,
                    maxScroll
                );

        }
    );


    // =====================================================
    // SECTION UI
    // =====================================================

    function updateUI() {
const ecosystem =
    document.getElementById("ecosystem");

const secretHint =
    document.getElementById("secretHint");
        const section =
            Math.min(
                4,
                Math.floor(
                    currentScroll
                )
            );


        const data =
            logoData[section];


        counter.innerText =
            `0${section + 1} / 05`;


        logoName.innerText =
            data.name;


        logoSub.innerText =
            data.sub;


        eyebrow.innerText =
            data.eyebrow;


        heroTitle.innerText =
            data.title;


        heroDescription.innerText =
            data.description;


        const percent =
            Math.round(
                (
                    currentScroll /
                    maxScroll
                ) * 100
            );


        scrollProgress.style.width =
            percent + "%";


        progressText.innerText =
            String(percent).padStart(
                2,
                "0"
            ) + "%";


        if (
            section === 4
        ) {

            floatingMessage.innerText =
                "ENTERING SECRET SPACE";

        } else {

            floatingMessage.innerText =
                "SCROLL TO CONTINUE";

        }

    }


    // =====================================================
    // LOGO ANIMATION
    // =====================================================

    function updateLogos() {

        logoMeshes.forEach(
            (mesh, index) => {

                const distance =
                    Math.abs(
                        currentScroll -
                        index
                    );


                const targetOpacity =
                    THREE.MathUtils.clamp(
                        1 -
                        distance *
                        1.4,
                        0,
                        .9
                    );


                mesh.material.opacity +=
                    (
                        targetOpacity -
                        mesh.material.opacity
                    ) * .1;


                const scale =
                    THREE.MathUtils.clamp(
                        1.25 -
                        distance *
                        .8,
                        .15,
                        1.3
                    );


                mesh.scale.lerp(
                    new THREE.Vector3(
                        scale,
                        scale,
                        scale
                    ),
                    .08
                );


                mesh.rotation.y +=
                    .003;


                mesh.rotation.z =
                    Math.sin(
                        performance.now() *
                        .0005 +
                        index
                    ) * .06;


                mesh.position.x =
                    (
                        index % 2 === 0
                            ? -5
                            : 5
                    ) +
                    Math.sin(
                        currentScroll *
                        1.5 +
                        index
                    ) *
                    1.5;

            }
        );

    }


    // =====================================================
    // UPDATE WORLD
    // =====================================================

    function updateWorld() {

        currentScroll +=
            (
                targetScroll -
                currentScroll
            ) * .075;


        // CAMERA

        camera.position.z =
            18 -
            currentScroll *
            32;


        camera.position.x =
            Math.sin(
                currentScroll *
                .75
            ) * 2.8;


        camera.position.y =
            Math.cos(
                currentScroll *
                .55
            ) * 1.3;


        camera.rotation.z =
            Math.sin(
                currentScroll *
                .7
            ) * .025;


        camera.rotation.y =
            Math.sin(
                currentScroll *
                .4
            ) * .08;


        // STARS

        stars.rotation.y =
            currentScroll *
            .035;


        stars.rotation.x =
            currentScroll *
            .01;


        // GRID

        grid.position.z =
            camera.position.z -
            25;


        grid.rotation.y =
            Math.sin(
                currentScroll
            ) * .015;


        // RINGS

        energyRings.forEach(
            (ring, index) => {

                ring.rotation.z +=
                    .002 +
                    index *
                    .00015;


                ring.rotation.y =
                    Math.sin(
                        currentScroll +
                        index
                    ) * .2;


                ring.scale.setScalar(
                    1 +
                    Math.sin(
                        currentScroll *
                        2 +
                        index
                    ) * .08
                );

            }
        );


        // CUBES

        cubes.forEach(
            cube => {

                cube.rotation.x +=
                    cube.userData.speed;

                cube.rotation.y +=
                    cube.userData.speed *
                    .8;

            }
        );


        // TUNNEL

        tunnelGroup.rotation.z =
            currentScroll *
            .12;


        // PORTAL

        portalGroup.rotation.z +=
            .003;

        portalGroup.rotation.y =
            Math.sin(
                currentScroll
            ) * .2;


        // LIGHT MOVEMENT

        mainLight.position.x =
            Math.sin(
                currentScroll
            ) * 8;


        mainLight.position.y =
            Math.cos(
                currentScroll *
                1.2
            ) * 5;


        sideLight.position.z =
            -20 -
            currentScroll *
            20;


        secondLight.position.z =
            -30 -
            currentScroll *
            15;


        updateLogos();

        updateUI();
// =====================================================
// CINEMATIC ECOSYSTEM TRANSITION
// =====================================================

if (
    currentScroll >= 1.0 &&
    currentScroll < 3.7
) {

    ecosystem.style.opacity = "1";
    secretHint.style.opacity = "0";

} else if (
    currentScroll >= 3.7 &&
    currentScroll < 4.6
) {

    ecosystem.style.opacity = "0";

    secretHint.style.opacity =
        Math.min(
            1,
            (currentScroll - 3.7) * 2
        );

} else {

    ecosystem.style.opacity = "0";
    secretHint.style.opacity = "1";

}

        // FINAL TRIGGER

        if (
            currentScroll >=
            maxScroll - .015 &&
            !finalTriggered
        ) {

            triggerFinal();

        }

    }


    // =====================================================
    // FINAL TRANSFER
    // =====================================================

    function triggerFinal() {

        finalTriggered = true;

        targetScroll =
            maxScroll;


        floatingMessage.style.opacity =
            "0";


        skipButton.style.opacity =
            "0";


        gsap.to(
            finalOverlay,
            {
                autoAlpha: 1,
                duration: 1.2,
                ease: "power3.out"
            }
        );


        gsap.fromTo(
            ".final-symbol",
            {
                scale: .3,
                rotation: -180,
                opacity: 0
            },
            {
                scale: 1,
                rotation: 0,
                opacity: 1,
                duration: 1.5,
                ease: "back.out(1.7)"
            }
        );


        gsap.fromTo(
            "#finalOverlay h2",
            {
                y: 60,
                opacity: 0
            },
            {
                y: 0,
                opacity: 1,
                duration: 1.2,
                delay: .3,
                ease: "power4.out"
            }
        );


        gsap.fromTo(
            ".final-line",
            {
                width: 0
            },
            {
                width: 100,
                duration: 1,
                delay: .8
            }
        );


        // AUTOMATIC TRANSFER

        setTimeout(
            () => {

                window.location.href =
                    "secret.html";

            },
            2800
        );

    }


    // =====================================================
    // SKIP
    // =====================================================

    skipButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "secret.html";

        }
    );


    // =====================================================
    // LOADER
    // =====================================================

    let loadPercent = 0;


    const loaderInterval =
        setInterval(
            () => {

                loadPercent +=
                    Math.random() *
                    12;


                if (
                    loadPercent >=
                    100
                ) {

                    loadPercent = 100;

                    clearInterval(
                        loaderInterval
                    );


                    setTimeout(
                        () => {

                            loading.style.opacity =
                                "0";

                            loading.style.visibility =
                                "hidden";

                        },
                        300
                    );

                }


                loadingProgress.style.width =
                    loadPercent + "%";

            },
            100
        );


    // =====================================================
    // RESIZE
    // =====================================================

    window.addEventListener(
        "resize",
        () => {

            camera.aspect =
                window.innerWidth /
                window.innerHeight;


            camera.updateProjectionMatrix();


            renderer.setSize(
                window.innerWidth,
                window.innerHeight
            );

        }
    );


    // =====================================================
    // RENDER LOOP
    // =====================================================

    function animate() {

        requestAnimationFrame(
            animate
        );


        updateWorld();


        renderer.render(
            scene,
            camera
        );

    }


    animate();

});