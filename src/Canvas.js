import * as THREE from 'three'
import gsap from 'gsap'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { SSREffect } from 'screen-space-reflections'
import * as POSTPROCESSING from "postprocessing"

import { SSRDebugGUI } from "./SSRDebugGUI"


class Canvas {
    constructor(){
        this.clock = new THREE.Clock()

		this.selectedObject = null
		this.bloomEffect = null
		this.pass = null
        this.selection = new POSTPROCESSING.Selection()

        this.options = {
            enabled: true,
            resolutionScale: 1,
            velocityResolutionScale: 1,
            correctionRadius: 1.1,
            blend: 0.95,
            correction: 0.5,
            blur: 1,
            blurSharpness: 20,
            blurKernel: 0.2,
            distance: 20,
            intensity: 2,
            exponent: 1.25,
            maxRoughness: 0.99,
            jitter: 0,
            jitterRoughness: 2,
            roughnessFade: 1,
            fade: 1.03,
            thickness: 8,
            ior: 2,
            fade: 0,
            steps: 8,
            refineSteps: 6,
            maxDepthDifference: 150,
            missedRays: false
        }
    
        this.loaderManager = new THREE.LoadingManager()

        this.createRenderer()
        this.createScene()
        this.createCamera()
        this.createGeometry()
        this.createLights()

        this.composer = new POSTPROCESSING.EffectComposer(this.renderer)
        this.composer.addPass(new POSTPROCESSING.RenderPass(this.scene, this.camera))

        this.addEffects()

        this.onResize()
        this.update()
        
        window.addEventListener('resize', _ => {this.onResize()})
        this.loaderManager.onLoad = () => {
            this.loadingAnimation()
        }

        this.loaderManager.onStart = () => {
        }

        this.loaderManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            // console.log(itemsLoaded/itemsTotal)
        }
    }

    loadingAnimation(){
        const preloader = document.querySelector('.preloader')

        const timeline = gsap.timeline({
            ease: 'Power2.easeInOut'
        })

        timeline.to('.pretext .char', {
            autoAlpha: 0,
            y: -30,
            rotateX: '-90deg',
            duration: 0.5,
            ease: "Power4.out",
            delay: 0.5,
            stagger: {
              amount: 0.3
            }
        })
        .to(preloader, {
            autoAlpha: 0,
            duration: 1
        })
        .to('.divider', {
            x: '0%',
            duration: 1,
            ease: 'Power2.easeOut'
        },'-=0.3') 
        
        timeline.to('.title .char', {
            autoAlpha: 1,
            y: '0%',
            duration: 0.5,
            ease: "Power4.out",
            delay: 0.5,
            stagger: {
              amount: 0.3
            }
        })

        timeline.to('.subtitle .char', {
            autoAlpha: 1,
            y: '0%',
            duration: 0.5,
            ease: "Power4.out",
            delay: 0.5,
            stagger: {
              amount: 0.3
            }
        },'-=1')
    }

    createRenderer () {
		this.renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            premultipliedAlpha: false,
            depth: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: true
		})
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.setPixelRatio(window.devicePixelRatio || 1)
		this.renderer.autoClear = true
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = 1.5
        this.renderer.outputEncoding = THREE.sRGBEncoding
		document.body.appendChild(this.renderer.domElement)
	}

	createCamera () {
		this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000)

        this.controls = new OrbitControls(this.camera, this.renderer.domElement)

        if(window.innerWidth <= 500){
            this.camera.fov = 85
        } 
        this.camera.position.set(0, 0.8, 4.4)
        this.controls.target = new THREE.Vector3(0, 1.8, -3)
        this.controls.enableDamping = true
        this.controls.panSpeed = 0.3
        this.controls.minDistance = 2
		this.controls.maxDistance = 8
        this.controls.update()
	}

	createScene() {
		this.scene = new THREE.Scene()
	}

    createGeometry() {

		this.mesh = new THREE.Mesh()
		this.loader = new GLTFLoader(this.loaderManager)
		const dracoLoader = new DRACOLoader(this.loaderManager)
		dracoLoader.setDecoderPath('/draco/')
		this.loader.setDRACOLoader(dracoLoader)

		this.loader.load('/loft-v1.glb', (gltf) => {
			const box = new THREE.Box3()
			const center = box.getCenter( new THREE.Vector3() )
			let frameEmit
			gltf.scene.position.x += (gltf.scene.position.x - center.x)
			gltf.scene.position.y += (gltf.scene.position.y - center.y)
			gltf.scene.position.z += (gltf.scene.position.z - center.z)
			
			this.mesh.add(gltf.scene)

            gltf.scene.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true
                    c.receiveShadow = true

                    c.material.color.setScalar(0.07)
                    c.material.roughness = 0.4

                    if(c.name === 'painting001'){
                        c.position.z = c.position.z - 1
                    }

                    if (c.material.name === 'Material.003') {
                        c.material.roughness = 1

                    }

                    if (c.material.name === 'table-lamp') {
                        c.material.emissive = new THREE.Color(0xE74D00)
                        c.material.emissiveIntensity = 5

                    }
                    
                    if (c.material.name.includes("floor")) {
                        c.material.roughness = 0.003

                    }

                    if (c.material.name === "glass") {
                        c.material.roughness = 0.11
                        c.material.transparent = true
                        c.material.ior = 1.33
                        c.material.iridescenceIOR = 2
                        c.material.thickness = 1 
                        c.material.opacity = 0.2
                        c.material.emissiveIntensity = 0

                    }

                    if (c.material.name === 'frame-emit') {
                        c.material.emissiveIntensity = 3

                    }

                    if (c.material.name.includes("art")) {
                        c.material.emissiveIntensity = 3
                        c.material.roughness = 0.3

                    }

                    if(c.material.name === 'lamp'){
                        c.material.emissiveIntensity = 0.5
                    }
           
        
                }
        
                c.updateMatrixWorld()
                
            })

            this.ssrEffect = new SSREffect(this.scene, this.camera, this.options)
            window.ssrEffect = this.ssrEffect

            // const gui = new SSRDebugGUI(this.ssrEffect, this.options)
            
            const bloomEffect = new POSTPROCESSING.BloomEffect({
                intensity: 2,
                blendFunction: POSTPROCESSING.BlendFunction.ADD,
                luminanceThreshold: 0.7,
                luminanceSmoothing: 0.8,
                kernelSize: POSTPROCESSING.KernelSize.HUGE,
                mipmapBlur: true
            })
    
            const vignetteEffect = new POSTPROCESSING.VignetteEffect({
                darkness: 0.3
            })
    
            const fxaaEffect = new POSTPROCESSING.FXAAEffect()

            
            this.composer.addPass(
                new POSTPROCESSING.EffectPass(this.camera, fxaaEffect, this.ssrEffect, bloomEffect, vignetteEffect)
            )
		})
        
        this.scene.add(this.mesh)
	}

    
	createLights() {
        this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3)
		this.scene.add(this.ambientLight)

        const spotLight = new THREE.SpotLight( 0xddc9cd, 5 );
        spotLight.position.set( 4, 5, -5 );
        spotLight.penumbra = 1;
        spotLight.angle = 0.3;
        spotLight.decay = 2;
        spotLight.distance = 12;

        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 512;
        spotLight.shadow.mapSize.height = 512;
        spotLight.shadow.camera.near = 10;
        spotLight.shadow.camera.far = 200;
        spotLight.shadow.focus = 1;
        this.scene.add( spotLight );

        const sphere = new THREE.SphereGeometry( 0.09 );
        const light1 = new THREE.PointLight( 0xffe3ac, 0.1, 2 );
        light1.add( new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { color: 0xffe3ac } ) ) );
        light1.position.set(-1.13, 2.18, -0.8)
        this.scene.add( light1 );

        const light2 = new THREE.PointLight( 0xffe3ac, 0.1, 2 );
        light2.add( new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { color: 0xffe3ac } ) ) );
        light2.position.set(-1.75, 3, -0.8)
        this.scene.add( light2 );


        // const lightHelper = new THREE.SpotLightHelper( spotLight );
        // this.scene.add( lightHelper );



	}

    addEffects(){

	}

    //EVENTS
    onResize() {
		const windowWidth = window.innerWidth
		const windowHeight = window.innerHeight

		this.camera.aspect = windowWidth/windowHeight
		this.camera.updateProjectionMatrix()

		this.renderer.setSize(windowWidth, windowHeight)
        if (this.ssrEffect) this.ssrEffect.setSize(window.innerWidth, window.innerHeight)
	}

    //LOOP
    update() {
        // this.renderer.render(this.scene, this.camera)
        this.controls.update()
        
        this.composer.render()

        window.requestAnimationFrame(this.update.bind(this))
	}

}

export default Canvas