import * as THREE from "three";
//to be able to move the scene yourself
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";
import { ViewHelper } from 'jsm/helpers/ViewHelper.js';

const form = document.getElementById("file-form");
const playButton = document.getElementById("play-button");
const pauseButton = document.getElementById("pause-button");
const infoButton = document.getElementById("info-button");
const container = document.getElementById("viewer");
const popup = document.getElementById("info-popup");

//check boxes
const loadAtOrigin = document.getElementById("load-at-origin");
const autoOffset = document.getElementById("auto-offset");

//scrubber
const scrubber = document.getElementById("scrubber");
const timeLabel = document.getElementById("time-label");
let currentTime = 0;
let duration = 0;
let wasPlaying = false;
let SPEED = 1;
//speed select
const speedSelect = document.getElementById("speed-select");
speedSelect.addEventListener("change", () => {
    SPEED = parseFloat(speedSelect.value);
});

function updateLabel() {
    timeLabel.textContent = currentTime.toFixed(1) + " / " + duration.toFixed(1) + "s";
}
scrubber.addEventListener("pointerdown", () => {
    wasPlaying = isPlaying;
    isPlaying = false;
});
scrubber.addEventListener("input", () => {
    currentTime = parseFloat(scrubber.value);
    mixers.forEach((m) => m.setTime(currentTime));
    updateLabel();
});
scrubber.addEventListener("pointerup", () => {
    isPlaying = wasPlaying
});

//[loadAtOrigin, autoOffset].forEach((el) =>
  //  el.addEventListener("change", () => entries.forEach(placeEntry)));


//RENDERER
//set the size of the renderer with width and height
const w = container.clientWidth;
const h = container.clientHeight;
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(w, h);
renderer.autoClear = false;

renderer.toneMapping = THREE.ACESFilmicToneMapping; // Gives a cinematic, realistic fallback
renderer.toneMappingExposure = 1.0;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;


//append the renderer to the HTML file
container.appendChild(renderer.domElement);

//CAMERA
const fov = 75; //75 degrees
const aspect = w/h;
const near = 0.01; //anything closer to the camera than 0.1 units stops rendering
const far = 40;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

//this allows you to move around the scene
const controls = new OrbitControls(camera, renderer.domElement);
//Damping things will make the item in the scene have a bit of ice sliding effect coolish not needed
//controls.enableDamping = true;
//controls.dampingFactor = 0.03;

const meow = new ViewHelper(camera, renderer.domElement);
/*FILE UPLOAD */
const fileInput = document.getElementById("mocapFile");
const loader = new GLTFLoader();
let mixer = null;
let model = null;
let isPlaying = false;
// get the list of all the model entries
const entries = [];
const mixers = [];
// automatic spacing for the models
const SPACING = 1.5;

form.addEventListener("change", function(event) {
    //event.preventDefault(); // IMPORTANT!
    const selectedFile = fileInput.files[0];

    if (!selectedFile) {
        console.log("Please select a GLB file");
        return;
    }
    const fileURL = URL.createObjectURL(selectedFile);
    loader.load(
        fileURL,
        (gltf) => {

            const model = gltf.scene;
            const group = new THREE.Group();
            group.add(model);
            scene.add(group);

            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip).play()
                    duration = Math.max(duration, clip.duration);
                });

                mixers.push(mixer);
                mixer.setTime(currentTime);   // sync new model with the others
                scrubber.max = duration;
                scrubber.disabled = false;
                updateLabel();
                isPlaying = true;
                playButton.disabled = false;
                pauseButton.disabled = false;

            }

            model.updateMatrixWorld(true);
            entries.push({ group, model, mixer });
            placeEntry(entries[entries.length - 1], entries.length -1);
            model.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.update(); });
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            controls.target.copy(center);

            // Move the camera so the model fits in view
            const maxDimension = Math.max(size.x, size.y, size.z);
            camera.position.set(
                center.x,
                center.y,
                center.z + maxDimension
            );
            camera.near = 0.001;
            camera.far = Math.max(1000, maxDimension * 10);
            camera.updateProjectionMatrix();

            controls.update();

            //Check if there is an animation
            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play();
            });

            isPlaying = true;

            playButton.disabled = false;
            pauseButton.disabled = false;

            /*
            status.textContent =
                "Character loaded. Playing " +
                gltf.animations.length + " animation(s).";
                */

            console.log("Animations:", gltf.animations);
            } else {
                isPlaying = false;

                playButton.disabled = true;
                pauseButton.disabled = true;

                /*
                status.textContent =
                    "Character loaded, but no animations were found.";
                    */

                console.log("This file has no embedded animations.");
            }



            console.log("Model loaded successfully!");
            URL.revokeObjectURL(fileURL);
            },
            undefined,
            (error) => {
                console.error("Error loading GLB:", error);
                URL.revokeObjectURL(fileURL);
            }
    );
});


playButton.addEventListener("click", () => { isPlaying = true; });
pauseButton.addEventListener("click", () => { isPlaying = false; });

infoButton.addEventListener("click", function() {
    if(popup.hidden) {
        popup.hidden = false;
    } else {
        popup.hidden = true;
    }
});

/*
const geo = new THREE.IcosahedronGeometry(1.0, 2);
const mat = new THREE.MeshStandardMaterial({
    color: 0xccff,
    flatShading: true
});
const mesh = new THREE.Mesh(geo, mat);
*/
//scene.add(mesh);

//Add light white on the top and black on the bottom
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff)
scene.add(hemiLight);

scene.background = new THREE.Color(0x333333);

const size = 20;
const divisions = 20;
const gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x888888);
scene.add(gridHelper);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

const clock = new THREE.Clock();
function animate() {
    //time difference each time
    requestAnimationFrame(animate);
    //controls.update();
    const delta = clock.getDelta();

    if (isPlaying && duration > 0) {
        currentTime += delta * SPEED;
        if (currentTime > duration) currentTime = 0;   // loop
        mixers.forEach((m) => m.setTime(currentTime));
        scrubber.value = currentTime;
        updateLabel();
    }
    renderer.clear();
    renderer.render(scene, camera);

    meow.render(renderer);
}

function placeEntry(entry, index) {
    const {group, model} = entry;
    group.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    if (loadAtOrigin.checked) {
        const box = new THREE.Box3().setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        group.position.set(-c.x, 0, -c.z);
    } else if (autoOffset.checked) {
        let maxXVal = -Infinity;
        entries.forEach((e) => {
            if (e == entry) return;
            const b = new THREE.Box3().setFromObject(e.group);
            maxXVal = Math.max(maxXVal, b.max.x);
        });
        if (maxXVal !== -Infinity) group.position.x = maxXVal + SPACING;
    }
}

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);
resize(); // run once on load

animate();
