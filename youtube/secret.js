document.addEventListener("DOMContentLoaded", () => {

    console.log("VAULT JS STARTED");

    const nameScreen =
        document.getElementById("nameScreen");

    const nameForm =
        document.getElementById("nameForm");

    const nameInput =
        document.getElementById("nameInput");

    const nameError =
        document.getElementById("nameError");

    const authorizeButton =
        document.getElementById("authorizeButton");

    const vaultArea =
        document.getElementById("vaultArea");

    const vaultDoor =
        document.getElementById("vaultDoor");

    const handle =
        document.getElementById("handle");

    const bolts =
        document.querySelectorAll(".bolt");

    const lockStatus =
        document.getElementById("lockStatus");

    const accessStatus =
        document.getElementById("accessStatus");

    const progressBar =
        document.getElementById("progressBar");

    const message =
        document.getElementById("message");

    const vaultInside =
        document.getElementById("vaultInside");

    const finalScreen =
        document.getElementById("finalScreen");

    const flash =
        document.getElementById("flash");

    const skipButton =
        document.getElementById("skipButton");

    const continueButton =
        document.getElementById("continueButton");


    /* =========================
       CHECK GSAP
    ========================= */

    if (typeof gsap === "undefined") {

        console.error("GSAP NOT LOADED");

        message.textContent =
            "GSAP FAILED TO LOAD";

        return;
    }


    /* =========================
       PARTICLES
    ========================= */

    const particleContainer =
        document.getElementById("particles");

    if (particleContainer) {

        for (let i = 0; i < 70; i++) {

            const particle =
                document.createElement("span");

            particle.style.position =
                "absolute";

            particle.style.width =
                (Math.random() * 3 + 1) + "px";

            particle.style.height =
                particle.style.width;

            particle.style.borderRadius =
                "50%";

            particle.style.background =
                "rgba(190,220,230,.35)";

            particle.style.left =
                Math.random() * 100 + "%";

            particle.style.top =
                Math.random() * 100 + "%";

            particleContainer.appendChild(
                particle
            );

            gsap.to(particle, {

                y:
                    -40 -
                    Math.random() * 100,

                x:
                    (Math.random() - .5) * 60,

                opacity:
                    Math.random() * .5,

                duration:
                    2 + Math.random() * 3,

                repeat: -1,

                yoyo: true,

                ease: "sine.inOut",

                delay:
                    Math.random() * 2
            });
        }
    }


    /* =========================
       INITIAL STATE
    ========================= */

    gsap.set(nameScreen, {
        opacity: 1
    });

    gsap.set(vaultArea, {
        scale: .72,
        opacity: 0
    });

    gsap.set(vaultDoor, {
        rotationY: 0
    });

    gsap.set(handle, {
        rotation: 0
    });

    gsap.set(vaultInside, {
        opacity: 0,
        scale: .7
    });

    gsap.set(finalScreen, {
        opacity: 0,
        visibility: "hidden"
    });


    /* =========================
       NAME SCREEN INTRO
    ========================= */

    gsap.from(".name-card", {

        y: 45,
        scale: .92,
        opacity: 0,

        duration: 1.2,

        ease: "power3.out"
    });

    gsap.from(
        ".name-symbol, .name-small, .name-card h1, .name-card p, #nameForm",
        {
            y: 20,
            opacity: 0,

            duration: .7,

            stagger: .08,

            delay: .25,

            ease: "power2.out"
        }
    );


    /* =========================
       PROGRESS
    ========================= */

    function setProgress(value) {

        gsap.to(progressBar, {

            width: value + "%",

            duration: .35,

            ease: "power2.out"
        });
    }


    /* =========================
       MESSAGE
    ========================= */

    function setMessage(text) {
        message.textContent = text;
    }


    /* =========================
       NAME AUTHORIZATION
    ========================= */

    nameForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            const name =
                nameInput.value.trim();

            if (!name) {

                nameError.textContent =
                    "PLEASE ENTER YOUR NAME";

                gsap.fromTo(
                    nameInput,
                    { x: -8 },
                    {
                        x: 8,
                        duration: .08,
                        repeat: 5,
                        yoyo: true,
                        clearProps: "x"
                    }
                );

                return;
            }

            if (name.length < 2) {

                nameError.textContent =
                    "NAME IS TOO SHORT";

                return;
            }

            nameError.textContent = "";

            authorizeButton.disabled = true;

            authorizeButton.innerHTML =
                "AUTHORIZING...";

            setMessage(
                "IDENTITY RECEIVED..."
            );

            gsap.to(nameScreen, {

                opacity: 0,

                duration: 1,

                ease: "power2.inOut",

                onComplete: () => {

                    nameScreen.style.display =
                        "none";

                    startVault();
                }
            });
        }
    );


    /* =========================
       FINAL SCREEN
    ========================= */

    function showFinal() {

        gsap.set(finalScreen, {
            visibility: "visible"
        });

        gsap.to(finalScreen, {

            opacity: 1,

            duration: 1.5,

            ease: "power2.out"
        });


        gsap.from(".final-icon", {

            scale: .2,

            opacity: 0,

            duration: 1,

            ease: "back.out(1.7)"
        });


        gsap.from(".final-small", {

            y: 20,

            opacity: 0,

            duration: .8
        });


        gsap.from(".final-screen h1", {

            y: 40,

            opacity: 0,

            duration: 1,

            delay: .2,

            ease: "power3.out"
        });


        gsap.from(".final-screen p", {

            y: 20,

            opacity: 0,

            duration: .8,

            delay: .4
        });


        gsap.from("#continueButton", {

            y: 20,

            opacity: 0,

            duration: .8,

            delay: .6
        });
    }


    /* =========================
       VAULT ANIMATION
    ========================= */

    function startVault() {

        console.log(
            "VAULT ANIMATION STARTED"
        );

        setMessage(
            "AUTHENTICATING..."
        );


        gsap.to(vaultArea, {

            scale: 1,

            opacity: 1,

            duration: 1.4,

            ease: "power3.out"
        });


        const tl =
            gsap.timeline({
                delay: 1
            });


        /* AUTH */

        tl.to({}, {

            duration: 1.1,

            onStart: () => {

                setMessage(
                    "SCANNING SECURITY SYSTEM..."
                );
            }
        });


        /* 8 LOCKS */

        bolts.forEach(
            (bolt, index) => {

                tl.to(bolt, {

                    scale: 1.3,

                    duration: .18,

                    ease: "power2.out"
                });

                tl.to(bolt, {

                    scale: 1,

                    duration: .18
                });

                tl.call(() => {

                    bolt.classList.add(
                        "unlocked"
                    );

                    setProgress(
                        (index + 1) * 10
                    );

                    setMessage(
                        "LOCK " +
                        (index + 1) +
                        " / 8 UNLOCKED"
                    );
                });
            }
        );


        /* ALL LOCKS */

        tl.call(() => {

            lockStatus.textContent =
                "UNLOCKED";

            accessStatus.textContent =
                "AUTHORIZED";

            setMessage(
                "ALL LOCKS RELEASED"
            );
        });


        /* HANDLE */

        tl.to(handle, {

            rotation: 90,

            duration: 1.5,

            ease: "power2.inOut"
        });


        tl.call(() => {

            setMessage(
                "VAULT MECHANISM ENGAGED"
            );
        });


        /* WAIT */

        tl.to({}, {
            duration: 1
        });


        /* INSIDE LIGHT */

        tl.to(vaultInside, {

            opacity: 1,

            scale: 1,

            duration: 1.2,

            ease: "power2.out"
        });


        tl.call(() => {

            setMessage(
                "OPENING VAULT..."
            );
        });


        /* DOOR */

        tl.to(vaultDoor, {

            rotationY: -82,

            duration: 5,

            ease: "power2.inOut"
        });


        /* FLASH */

        tl.to(flash, {

            opacity: .8,

            duration: .12
        });

        tl.to(flash, {

            opacity: 0,

            duration: 1
        });


        /* ACCESS */

        tl.call(() => {

            setProgress(100);

            lockStatus.textContent =
                "OPEN";

            accessStatus.textContent =
                "OPEN";

            setMessage(
                "ACCESS GRANTED"
            );

            showFinal();
        });
    }


    /* =========================
       SKIP
    ========================= */

    function skipAnimation() {

        bolts.forEach(
            bolt => {

                bolt.classList.add(
                    "unlocked"
                );
            }
        );

        setProgress(100);

        lockStatus.textContent =
            "OPEN";

        accessStatus.textContent =
            "OPEN";

        setMessage(
            "ACCESS GRANTED"
        );

        gsap.to(handle, {
            rotation: 90,
            duration: .5
        });

        gsap.to(vaultInside, {

            opacity: 1,

            scale: 1,

            duration: .8
        });

        gsap.to(vaultDoor, {

            rotationY: -82,

            duration: 2,

            ease: "power2.inOut",

            onComplete:
                showFinal
        });
    }


    /* =========================
       BUTTONS
    ========================= */

    skipButton.addEventListener(
        "click",
        skipAnimation
    );


    continueButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "home.html";
        }
    );

});