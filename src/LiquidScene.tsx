import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export default function LiquidScene({paused}:{paused:boolean}){
  const host=useRef<HTMLDivElement>(null),pauseRef=useRef(paused);
  useEffect(()=>{pauseRef.current=paused;},[paused]);
  useEffect(()=>{const el=host.current;if(!el)return;let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,40);camera.position.z=10;
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;
    const uniform={value:0},geometry=new THREE.IcosahedronGeometry(1.5,4);
    const material=new THREE.MeshPhysicalMaterial({color:'#efce87',metalness:.55,roughness:.1,transmission:.32,thickness:1.5,clearcoat:1,ior:1.4,transparent:true,opacity:.8});
    material.onBeforeCompile=shader=>{shader.uniforms.liquidTime=uniform;shader.vertexShader='uniform float liquidTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += normal * sin(position.x*2.3+liquidTime)*cos(position.y*2.5-liquidTime*.7)*.28;');};
    const left=new THREE.Mesh(geometry,material);left.position.set(-4,.7,0);left.scale.set(1.1,1.6,.8);scene.add(left);
    const right=new THREE.Mesh(geometry,material);right.position.set(4,-.3,-1);right.scale.set(.9,.7,1);scene.add(right);
    const light=new THREE.DirectionalLight('#fff2d6',3);light.position.set(1,3,5);scene.add(light);
    let visible=false,frame=0;const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const resize=new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();});resize.observe(el);
    const observer=new IntersectionObserver(([entry])=>visible=entry.isIntersecting);observer.observe(el);
    const render=(time:number)=>{frame=requestAnimationFrame(render);if(!visible||document.hidden||pauseRef.current)return;if(!motion.matches){uniform.value=time*.0006;left.rotation.y=time*.00015;left.rotation.z=Math.sin(time*.0003)*.3;right.rotation.x=time*.0002;right.position.y=-.3+Math.sin(time*.0005)*.4;}renderer.render(scene,camera);};frame=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();geometry.dispose();material.dispose();env.dispose();room.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <div className="liquid-review-scene" ref={host} aria-hidden="true"/>;
}
