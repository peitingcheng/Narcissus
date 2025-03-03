/*
 * 👋 Hello! This is an ml5.js example made and shared with ❤️.
 * Learn more about the ml5.js project: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 *
 * This example demonstrates UV mapping with ml5.faceMesh.
 */

let faceMesh;
let video;
let faces = [];
let options = { maxFaces: 3, refineLandmarks: true, flipped: true };

let uvMapImage1;
let uvMapImage2;

let triangulation;
let uvCoords;

let offsetX = 0;
let offsetY = 0;

// 在全局變量區域添加
let dropImages = [];
let boxes = [];
let lastBoxTime = 0;
const BASE_SPAWN_INTERVAL = 500; // 基礎生成間隔（一張笑臉時）
const MIN_SPAWN_INTERVAL = 100;  // 最小生成間隔
let dotSize = 1;  // 網點大小
let dotSpacing = 20;  // 網點間距

// Box 類別定義
class Box {
  constructor(speedMultiplier = 1) {
    this.x = random(width);
    this.y = -50;
    this.size = random(60, 100); // 放大尺寸範圍
    this.speed = random(2, 5) * speedMultiplier;
    this.stopped = false;
    this.image = random(dropImages);
    this.rotation = 0;
    // 隨機決定順時針或逆時針旋轉
    this.rotationSpeed = random([-2, -1, 1, 2]); 
    this.collisionScale = 0.5; // 添加碰撞縮放因子，0.7表示碰撞區域為圖形大小的70%
  }

  update() {
    if (!this.stopped) {
      this.y += this.speed;
      // 更新旋轉角度
      this.rotation += this.rotationSpeed;
      
      if (this.y + this.size >= height) {
        this.y = height - this.size;
        this.stopped = true;
        this.rotation = 0; // 停止時重置旋轉角度
      } else {
        for (let other of boxes) {
          if (other !== this && other.stopped) {
            if (this.checkCollision(other)) {
              this.y = other.y - this.size;
              this.stopped = true;
              //this.rotation = 0; // 停止時重置旋轉角度
              break;
            }
          }
        }
      }
    }
  }

  checkCollision(other) {
    // 計算縮小後的碰撞區域大小
    const thisCollisionSize = this.size * this.collisionScale;
    const otherCollisionSize = other.size * other.collisionScale;
    
    // 計算碰撞區域的偏移量（使碰撞區域保持在圖形中心）
    const thisOffset = (this.size - thisCollisionSize) / 2;
    const otherOffset = (other.size - otherCollisionSize) / 2;

    return (
      (this.x + thisOffset) < (other.x + otherOffset + otherCollisionSize) &&
      (this.x + thisOffset + thisCollisionSize) > (other.x + otherOffset) &&
      (this.y + thisOffset + thisCollisionSize) > (other.y + otherOffset) &&
      (this.y + thisOffset) < (other.y + otherOffset + otherCollisionSize)
    );
  }

  draw() {
    push();
    translate(this.x + this.size/2, this.y + this.size/2); // 移動到圖片中心
    rotate(this.rotation); // 應用旋轉
    imageMode(CENTER);
    image(this.image, 0, 0, this.size, this.size); // 從中心點繪製圖片
    pop();
  }
}

function preload() {
  // Load the faceMesh model
  faceMesh = ml5.faceMesh(options);
  uvMapImage1 = loadImage("assets/UV3.png");
  uvMapImage2 = loadImage("assets/UV2.png");
  
  // 載入掉落物件的圖片
  for (let i = 1; i <= 9; i++) {
    dropImages.push(loadImage(`assets/drop${i}.PNG`));
  }
}

function setup() {
  createCanvas(1280, 720, WEBGL);
  angleMode(DEGREES);
  // Create the webcam video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  // Start detecting faces from the webcam video
  faceMesh.detectStart(video, gotFaces);
  // Get the Coordinates for the uv mapping
  triangulation = faceMesh.getTriangles();
  uvCoords = faceMesh.getUVCoords();

  
}

function draw() {
  translate(-width/2, -height/2);

  // 檢查是否有兩張臉同時在笑
  let smilingFaces = 0;
  for (let face of faces) {
    if (checkSmile(face)) {
      smilingFaces++;
    }
  }
  
  // 設置背景色
  background(smilingFaces >= 1 ? color(120, 120, 120) : 51);
  
  // 繪製半色調網點
  push();
  noStroke();
  fill(180);  // 網點顏色
  for (let x = 0; x < width; x += dotSpacing) {
    for (let y = 0; y < height; y += dotSpacing) {
      circle(x, y, dotSize);
    }
  }
  pop();

  // 根據笑臉數量調整生成間隔
  const currentSpawnInterval = Math.max(
    MIN_SPAWN_INTERVAL,
    BASE_SPAWN_INTERVAL / smilingFaces
  );

  // 更新和繪製方塊
  if (smilingFaces >= 1 && millis() - lastBoxTime > currentSpawnInterval) {
    // 根據笑臉數量調整方塊的速度
    const speedMultiplier = 1 + (smilingFaces - 1) * 0.5; // 每多一張笑臉增加50%速度
    const box = new Box(speedMultiplier);
    boxes.push(box);
    lastBoxTime = millis();
  }

  // 更新所有方塊
  for (let box of boxes) {
    if (smilingFaces >= 1) {
      box.update();
    }
    box.draw();
  }

  // 移除堆積過多的方塊以提升性能
  if (boxes.length > 100) {
    boxes = boxes.slice(-100);
  }

  // 右側顯示第一張臉
  push(); 
  scale(2);
  // Move to center of canvas

  for (let i = 0; i < faces.length; i++) {
    drawFace(faces[i], i);
  }
  pop();

  // 左側顯示第二張臉
  // push(); 
  // scale(2);
  // // Move to center of canvas
  // //translate(-width/4*2.5, -height/4);
  // if (faces.length > 1) {
  //   drawFace(faces[1], 1);
  // }
  // pop();
}

// 新增繪製臉部的函數
function drawFace(face, index) {
  // Calculate center offset for face
  // let box = face.box;
  // let centerX = width / 2;
  // let centerY = height / 4;
  // let rawOffsetX = centerX - box.xMin - box.width / 2;
  // let rawOffsetY = centerY - box.yMin - box.height / 2;

  // Smooth interpolation
  // offsetX = lerp(offsetX, rawOffsetX, 0.05);
  // offsetY = lerp(offsetY, rawOffsetY, 0.05);

  push();
  // translate(offsetX, offsetY);
  
  // 檢查是否在笑
  let isSmiling = checkSmile(face);
  if (isSmiling) {
    console.log(`Face ${index} is smiling!`);
  }

  // Draw UV mapped triangles
  noStroke();
  texture(index === 0 ? uvMapImage1 : uvMapImage2);
  textureMode(NORMAL);
  beginShape(TRIANGLES);
  for (let i = 0; i < triangulation.length; i++) {
    let indexA = triangulation[i][0];
    let indexB = triangulation[i][1];
    let indexC = triangulation[i][2];
    let a = face.keypoints[indexA];
    let b = face.keypoints[indexB];
    let c = face.keypoints[indexC];
    const uvA = { x: uvCoords[indexA][0], y: uvCoords[indexA][1] };
    const uvB = { x: uvCoords[indexB][0], y: uvCoords[indexB][1] };
    const uvC = { x: uvCoords[indexC][0], y: uvCoords[indexC][1] };
    vertex(a.x, a.y, uvA.x, uvA.y);
    vertex(b.x, b.y, uvB.x, uvB.y);
    vertex(c.x, c.y, uvC.x, uvC.y);
  }
  endShape();
  pop();
}

// Callback function for when faceMesh outputs data
function gotFaces(results) {
  // Save the output to the faces variable
  faces = results;
}

function mousePressed() {
    console.log(faces);
}

// 新增檢查笑容的函數
function checkSmile(face) {
  // 上唇中心點（上唇下緣）
  const upperLip = face.keypoints[13];
  // 下唇中心點（下唇上緣）
  const lowerLip = face.keypoints[14];
  
  // 計算唇間距離
  const lipDistance = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
  
  // 計算嘴角的位置
  const leftCorner = face.keypoints[61];
  const rightCorner = face.keypoints[291];
  
  // 計算嘴巴寬度
  const mouthWidth = dist(leftCorner.x, leftCorner.y, rightCorner.x, rightCorner.y);
  
  // 如果唇間距離相對嘴巴寬度大於某個閾值，判定為笑容
  return (lipDistance / mouthWidth) > 0.2;
}
