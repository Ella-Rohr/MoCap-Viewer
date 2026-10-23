import * as THREE from "three";
//to be able to move the scene yourself
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";

const form = document.getElementById("file-form");
const playButton = document.getElementById("play-button");
const pauseButton = document.getElementById("pause-button");


//RENDERER
//set the size of the renderer with width and height
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(w, h);

renderer.toneMapping = THREE.ACESFilmicToneMapping; // Gives a cinematic, realistic fallback
renderer.toneMappingExposure = 1.0;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

//append the renderer to the HTML file
document.body.appendChild(renderer.domElement);

//CAMERA
const fov = 75; //75 degrees
const aspect = w/h;
const near = 0.1; //anything closer to the camera than 0.1 units stops rendering
const far = 10;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

//this allows you to move around the scene
const controls = new OrbitControls(camera, renderer.domElement);
//Damping things will make the item in the scene have a bit of ice sliding effect coolish not needed
//controls.enableDamping = true;
//controls.dampingFactor = 0.03;

/*FILE UPLOAD */
const fileInput = document.getElementById("mocapFile");
const loader = new GLTFLoader();
let mixer = null;
let model = null;
let isPlaying = false;

form.addEventListener("submit", function(event) {
    event.preventDefault(); // IMPORTANT!
    const selectedFile = fileInput.files[0];

    if (!selectedFile) {
        console.log("Please select a GLB file");
        return;
    }
    const fileURL = URL.createObjectURL(selectedFile);
    loader.load(
        fileURL,
        (gltf) => {
            if (mixer) {
                mixer.stopAllAction();
                mixer = null;
            }


            const model = gltf.scene;
            scene.add(model);

            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            controls.target.copy(center);

            // Move the camera so the model fits in view
            const maxDimension = Math.max(size.x, size.y, size.z);
            camera.position.set(
                center.x,
                center.y,
                center.z + maxDimension * 2
            );
            camera.near = 0.01;
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


playButton.addEventListener("click", function() {
    if (mixer) {
        mixer.timeScale = 1;
        isPlaying = true;
        //status.textContent = "Animation playing.";
    }
});

// Pause animation
pauseButton.addEventListener("click", function() {
    if (mixer) {
        mixer.timeScale = 0;
        isPlaying = false;
        //status.textContent = "Animation paused.";
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

    if (mixer && isPlaying) {
        mixer.update(delta);
    }
    renderer.render(scene, camera);

}

animate();
