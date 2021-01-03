
var world, world2;
var running = false;
var beta = 0.3, phi = 0.3, alpha0 = 0.2, mu = 0.2, incubationPeriod = 100, infectionPeriod = 500;
var gui, visible=false;

function setup() {
  createCanvas(1000, 800)
  // put setup code here

  gui = createGui();
  sliderRange(0.1, 1, 0.1);
  gui.addGlobals('beta');

  sliderRange(0.1, 0.5, 0.1);
	gui.addGlobals('alpha0');

  sliderRange(0, 1, 0.1);
  gui.addGlobals('mu');
  
  sliderRange(0, 1, 0.1);
	gui.addGlobals('phi');

  sliderRange(0, 500, 50);
	gui.addGlobals('incubationPeriod')

  sliderRange(100, 500, 50);
  gui.addGlobals('infectionPeriod')


  
  world = new World(10,10,600);
  world.addParticles(0.5);


  runButton = createButton("play");
	runButton.mousePressed(togglePlaying);
  
  runButton = createButton("reset");
  runButton.mousePressed(resetCall);

	runButton = createButton("controls");
  runButton.mousePressed(toggleControls);
  

  gui.hide();
  noLoop();
}

function draw() {
  background(127);

  world.update();  
  world.show(); 
  if (frameCount>100  && !world.running) noLoop();
}

function resetCall(){
  world.particles = [];
  world.clickDistancingParticles = [];

  world.addParticles(0.5);
  draw();

}

function togglePlaying(){
  running = !running;
  if (running) loop();
  else noLoop();
}

function toggleControls(){
	visible = !visible;
	if (visible) gui.show();
	else gui.hide();
}

function mousePressed() {

  let n =  world.clickDistancing(mouseX,mouseY);

  world.distancingParticle(n)

}

//world class
class World{
  constructor(x,y,w){
    this.t = 0;
    this.dt = 1;
    this.particles = [];
    this.kinEnergy = 0.0;
    this.S = 0;
    this.E = 0;
    this.IR = 0;
    this.IU = 0;
    this.R = 0;
    this.D = 0;
    this.running = true;
    this.width=w;
    this.height=w;
    this.x = x;
    this.y = y;

    this.cellWidth = 25;
    this.nCellsX = int(this.width/this.cellWidth);
    this.cellList = Array(this.nCellsX*this.nCellsX);
    this.ncells = this.nCellsX*this.nCellsX;
    this.offset = [[0,0] , [1,0], [-1,1], [0,1],[1,1]];
    
    console.log(this.nCellsX, this.nCellsX,this.ncells);
    
    this.clickDistancingParticles = [];
    this.distancingRadius = 0.4*(width-this.width-this.x);
    var xc = this.x + this.width + this.distancingRadius + 0.05*this.distancingRadius;
    var yc = this.y + 0.25*this.height + this.distancingRadius;
    this.rc = createVector(xc,yc)
    
  }

  

  updateCellList(){
    for (let i = 0; i < this.ncells; i++) {
      this.cellList[i] = [-1];
    }
      
    this.particles.forEach(p => {
      let j = floor((p.position.x - this.x)/this.cellWidth);
      let i = floor((p.position.y - this.y)/this.cellWidth);
      if (0 <= i && i<this.nCellsX && 0 <= j && j<this.nCellsX ){
        let c = j + i*this.nCellsX
        p.cell = c;
        this.cellList[c].push(p.n); 
      }
    });
   }

  addParticle(p){
    this.particles.push(p);
  }

  addParticles2(density=0.2){
      var diam = 25;
      var parea = Math.PI*diam*diam/4;
      var warea = this.width*this.height;
      var nparticles = int(density*warea/parea);
      var minSep = 60;
      let vmean = 0.5;
      let vsd = 0.5;

      console.log('minSep=',minSep.toFixed(2))

      // initialize  Poisson Disk sampling
      // https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf
      var kmax = 10;
      var grid = [];
      var active = [];
      var gridWidth = 0.5*minSep/sqrt(2);
      var gridCols = floor(this.width/gridWidth)
      var gridRows = floor(this.height/gridWidth)
      for (var i = 0; i< gridCols*gridRows; i++) grid[i] = -1;  
      

      //step 1 - add seed particle
      var x = random(this.x, this.x + this.width);
      var y = random(this.y, this.y + this.height);
      var i = floor((x-this.x)/gridWidth );
      var j = floor((y-this.y)/gridWidth );
      var c = i + j*gridCols;
      var pos = createVector(x,y);

      grid[c] = pos; 
      active.push(pos)
      
      // step 2 - adding new particles
      var n = 1;
      while (active.length >0 && n<40 ){

          // 2.1 - select a random particle from the active list
          var rindex = floor(random(active.length));
          var posA = active[rindex]; 
          // 2.2 generate kmax samples
          var ok = false;
          var k = 0;         
          while(!ok || k == kmax){
              var sample = p5.Vector.random2D();
              var m = random(minSep, 2*minSep);
              sample.setMag(m); 
              sample.add(posA);

              if (sample.x < this.x || sample.x > (this.x+this.width)) {k++;continue;}
              if (sample.y < this.y || sample.y > (this.y+this.height)) {k++;continue;}
              var is = floor((sample.x - this.x)/gridWidth );
              var js = floor((sample.y - this.y)/gridWidth );
              var cs = is + js*gridCols;
              // check distance from previous particles
              ok = true;
              for (var io = -1; io<=1; io++){
                var i1 = (is+io);
                for (var jo = -1; jo<=1; jo++){
                      var j1 = (js+jo);
                      var co = i1 + j1*gridCols;
                      var neighbor = grid[co];
                      if (!neighbor) continue;
                      if (neighbor != -1){
                           var dist = p5.Vector.dist(sample, neighbor);
                           if (dist < minSep){
                             ok = false;
                           }
                       }
                  }
              }
              if (ok){
                 grid[cs] = sample;
                 active.push(sample);
                 n++;
              }
              k++ 
          }
          if (!ok){
            // remove point from list
            active.splice(rindex,1);
          }
      }

      n = 0;
      for (let i = 0; i < grid.length; i++) {
        const pos = grid[i];
        if(pos && pos!=-1){
          let p = new Particle(pos.x,pos.y);
          let v = p5.Vector.random2D();
          let vmag = randomGaussian(vmean, vsd);
          v.setMag(vmag);
          p.setVelocity(v.x,v.y);
          p.n = n;
          this.addParticle(p);
          n++;
        }
      }
      this.updateCellList();
  }

  addParticles(density=0.2){

    var r = this.width/this.height;
    var diam = 25;
    var parea = Math.PI*diam*diam/4;
    var nx = int(sqrt(density*this.width*this.width/parea))
    var ny = int(nx*r)
    print('nxx='+nx, 'nyy='+ny)

    //  r  = w/h = nx/ny
    // (nx*nx*pi*diam^2/4)/ = dens*w*w
    
    let dx = this.width/nx;
    let dy = this.height/ny;
    let vmean = 0.2;
    let vsd = 0.5;
    let n = 0;
    for (let j = 0; j< ny; j++){
      let y = this.y + (j+0.5)*dy + random(0,0.5*dy);; 
      for (let i = 0; i < nx; i++) {
        let x = this.x +(i+0.5)*dx + random(0,0.5*dx); 
        let p = new Particle(x,y);
        let v = p5.Vector.random2D();
        let vmag = randomGaussian(vmean, vsd);
        v.setMag(vmag);
        p.setVelocity(v.x,v.y);
        p.n = n;
        this.addParticle(p);
        n++;
      }
    }
    for (let i = 0; i< 1; i++){
      let n = round(random(0,this.particles.length-1));
      this.particles[n].s = 'E';
    }


    this.updateCellList();
    for(let i = 1; i<50; i++) this.update();
    for (let i = 0; i< this.particles.length; i++){
        this.particles[i].timeHealing = 0;
        this.particles[i].timeIncubation = 0;
    }
    this.t = -1;
  }
  
  wallCollision(){
    for (let i = 0; i < this.particles.length; i++) { 
      
      const p = this.particles[i];    
      if ( this.x < p.position.x && p.position.x < this.x + 0.5*p.diam) {
          p.position.x = this.x + 0.5*p.diam;
          p.velocity.x = -p.velocity.x
      }
      if (this.x +this.width> p.position.x && p.position.x  > this.x +this.width - 0.5*p.diam){
          p.position.x = this.x +this.width - 0.5*p.diam;
          p.velocity.x = -p.velocity.x
      } 
      if (this.y < p.position.y && p.position.y < this.y + 0.5*p.diam) {
          p.position.y = this.y + 0.5*p.diam;
          p.velocity.y = -p.velocity.y
      }
      if ( this.y + this.height > p.position.y && p.position.y > this.y +this.height - 0.5*p.diam){
          p.position.y = this.y +this.height - 0.5*p.diam;
          p.velocity.y = -p.velocity.y
      } 
    }
  }

  clickDistancingForce(){
      for(let k = 0; k < this.clickDistancingParticles.length; k++){
          let i = this.clickDistancingParticles[k];
          var maxR = this.distancingRadius - 0.5*this.particles[i].diam
          var dr = p5.Vector.sub(this.particles[i].position,this.rc);
          var drmagsq = dr.magSq()
          if ( drmagsq >= maxR*maxR){
              dr.normalize()
              let vn = p5.Vector.dot(dr, this.particles[i].velocity);
              let veln = p5.Vector.mult(dr,vn);
              let velt = p5.Vector.sub(this.particles[i].velocity, veln);
              this.particles[i].velocity = p5.Vector.sub(velt,veln);
              this.particles[i].position = p5.Vector.add(this.rc,p5.Vector.mult(dr,maxR));
          }
      }

      for(let k = 0; k < this.clickDistancingParticles.length-1; k++){
          let i = this.clickDistancingParticles[k];
          for(let l = k+1; l < this.clickDistancingParticles.length; l++){
            let j = this.clickDistancingParticles[l];
            const p_i = this.particles[i];
            const p_j = this.particles[j];
            var diam = 0.5*p_i.diam + 0.5*p_j.diam
            var diamSq = diam*diam; 
            var dr = p5.Vector.sub(p_j.position ,p_i.position);
            var distSq = dr.magSq();
            if (distSq<diamSq){ 
              
              // print('colide i='+i+' j='+j)

              var dist = sqrt(distSq);
              dr.div(dist);
              p_j.position = p5.Vector.add(p_i.position, p5.Vector.mult(dr,diam));
              let vin = p5.Vector.dot(p_i.velocity, dr);
              let velocity_i_n = p5.Vector.mult(dr,vin);
              let velocity_i_t = p5.Vector.sub(p_i.velocity,velocity_i_n);
              
              let vjn = p5.Vector.dot(p_j.velocity, dr);
              let velocity_j_n = p5.Vector.mult(dr,vjn);
              let velocity_j_t = p5.Vector.sub(p_j.velocity,velocity_j_n);
              
    
              p_i.velocity = p5.Vector.add(velocity_i_t, velocity_j_n);
              p_j.velocity = p5.Vector.add(velocity_j_t, velocity_i_n);
            }


          }
      }

  }


  elasticCollisions(){
      // run over all cells

      for(let c1=0; c1< this.ncells; c1++){
          let i1 = int(c1 / this.nCellsX);
          let j1 = c1 - i1*this.nCellsX;
          
          for (let s=0; s< this.offset.length; s++){
               let shift = this.offset[s];
               let i2 = i1 + shift[1];
               let j2 = j1 + shift[0];

               if (0 > i2 || i2 >= this.nCellsX) continue;
               if (0 > j2 || j2 >= this.nCellsX) continue;


              let c2 = j2 + i2*this.nCellsX;

              for (let k = this.cellList[c1].length-1; k>0 ; k-- ){
                  let i = this.cellList[c1][k];
                  for (let l = this.cellList[c2].length-1; l>0 ; l-- ){
                      let j = this.cellList[c2][l];
                      if (j != i){
                        const p_i = this.particles[i];
                        const p_j = this.particles[j];
                        var diam = 0.5*p_i.diam + 0.5*p_j.diam
                        var diamSq = diam*diam; 
                        var dr = p5.Vector.sub(p_j.position ,p_i.position);
                        var distSq = dr.magSq();
                        if (distSq<diamSq){ 
                          
                          // print('colide i='+i+' j='+j)

                          var dist = sqrt(distSq);
                          dr.div(dist);
                          p_j.position = p5.Vector.add(p_i.position, p5.Vector.mult(dr,diam));
                          let vin = p5.Vector.dot(p_i.velocity, dr);
                          let velocity_i_n = p5.Vector.mult(dr,vin);
                          let velocity_i_t = p5.Vector.sub(p_i.velocity,velocity_i_n);
                          
                          let vjn = p5.Vector.dot(p_j.velocity, dr);
                          let velocity_j_n = p5.Vector.mult(dr,vjn);
                          let velocity_j_t = p5.Vector.sub(p_j.velocity,velocity_j_n);
                          
                
                          p_i.velocity = p5.Vector.add(velocity_i_t, velocity_j_n);
                          p_j.velocity = p5.Vector.add(velocity_j_t, velocity_i_n);
                
                
                          if (p_i.s === 'IR' && p_j.s ==='S') {
                            let r = random();
                            if (r<beta ) p_j.s='E';
                          }else if (p_i.s === 'IU' && p_j.s ==='S') {
                            let r = random();
                            if (r<beta*mu) p_j.s='E';
                          }else if (p_j.s === 'IR' && p_i.s==='S') {
                            let r = random();
                            if (r<beta) p_i.s='E';
                          }else if (p_j.s === 'IU' && p_i.s==='S') {
                            let r = random();
                            if (r<beta*mu) p_i.s='E';
                          }
                 
                        }
                        
                      }
                  }
              }

          }
      }
  }

  elasticCollisionsAll(){
    for (let i = 0; i < this.particles.length-1; i++) {
      const p_i = this.particles[i];
      for (let j = i+1; j < this.particles.length; j++) {
        const p_j = this.particles[j];
       
        var diam = 0.5*p_i.diam + 0.5*p_j.diam
        var diamSq = diam*diam; 
        var dr = p5.Vector.sub(p_j.position ,p_i.position);
        var distSq = dr.magSq();

        if (distSq<diamSq){        
          var dist = sqrt(distSq);
          dr.div(dist);
          p_j.position = p5.Vector.add(p_i.position, p5.Vector.mult(dr,diam));
          let vin = p5.Vector.dot(p_i.velocity, dr);
          let velocity_i_n = p5.Vector.mult(dr,vin);
          let velocity_i_t = p5.Vector.sub(p_i.velocity,velocity_i_n);
          
          let vjn = p5.Vector.dot(p_j.velocity, dr);
          let velocity_j_n = p5.Vector.mult(dr,vjn);
          let velocity_j_t = p5.Vector.sub(p_j.velocity,velocity_j_n);
          

          p_i.velocity = p5.Vector.add(velocity_i_t, velocity_j_n);
          p_j.velocity = p5.Vector.add(velocity_j_t, velocity_i_n);


          if (p_i.s === 'IR' && p_j.s ==='S') {
            let r = random();
            if (r<beta ) p_j.s='E';
          }else if (p_i.s === 'IU' && p_j.s ==='S') {
            let r = random();
            if (r<beta*mu) p_j.s='E';
          }else if (p_j.s === 'IR' && p_i.s==='S') {
            let r = random();
            if (r<beta) p_i.s='E';
          }else if (p_j.s === 'IU' && p_i.s==='S') {
            let r = random();
            if (r<beta*mu) p_i.s='E';
          }
 
        }
      }
    }
  }

  computeProperties(){
    this.kinEnergy = 0.0;
    this.S = 0;
    this.E = 0;
    this.IR = 0;
    this.IU = 0;
    this.R = 0;
    this.D = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.kinEnergy += 0.5*p.velocity.magSq();
      if (p.s=='S') this.S++;
      else if (p.s=='E') this.E++;
      else if (p.s=='IR') this.IR++;
      else if (p.s=='IU') this.IU++;
      else if (p.s=='R') this.R++;
      else if (p.s=='D') this.D++;
    }
    this.running = (this.IR + this.IU + this.E) > 0;
    this.kinEnergy /= this.particles.length;
    this.S = 100*this.S/this.particles.length;
    this.E = 100*this.E/this.particles.length;
    this.IR = 100*this.IR/this.particles.length;
    this.IU = 100*this.IU/this.particles.length;
    this.R = 100*this.R/this.particles.length;
    this.D = 100*this.D /this.particles.length;
  }

  updatePos(dt){
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.position.x = p.position.x + p.velocity.x*dt
      p.position.y = p.position.y + p.velocity.y*dt


      if (p.s ==='E' ){
        p.timeIncubation += 1;
      }else if (p.s === 'IR' || p.s === 'IU' ){
        p.timeHealing +=1;
      }
      if (p.timeIncubation > incubationPeriod){
        let r = random();
        p.s = 'IU'
        if (r<alpha0) p.s = 'IR';
        p.timeHealing = 0;
        p.timeIncubation = 0;
      } 
      if (p.timeHealing > infectionPeriod){
        let r = random();
        if (p.s==='IR' && r < phi) p.s = 'D';
        else p.s = 'R';
        p.timeHealing = 0;
      }
    }
    this.updateCellList();
  }

  update(){
    this.elasticCollisions();
    this.wallCollision();
    this.clickDistancingForce();
    this.updatePos(this.dt);    
    this.computeProperties();
    this.t+=this.dt;
  }
  
  clickDistancing(mx,my){
    let j = floor((mx - this.x)/this.cellWidth);
    let i = floor((my - this.y)/this.cellWidth);
    let c = j + i*this.nCellsX
    let p = -1;
    let dist = 900;
    if ( 0 <= c && c < this.ncells){
      let i1 = int(c / this.nCellsX);
      let j1 = c - i1*this.nCellsX;
      for(let i2 = i1-1; i2< i1+2; i2++){
          for(let j2 = j1-1; j2< j1+2; j2++){
            if (i2 < 0) continue;
            if (j2 < 0) continue;
            if (i2 >= this.nCellsX) continue;
            if (j2 >= this.nCellsX) continue;
            let c2 = j2 + i2*this.nCellsX;
            for (let l = this.cellList[c2].length-1; l>0 ; l-- ){
              let il = this.cellList[c2][l];
              const pl = this.particles[il];
              let dl = (pl.position.x - mx)*(pl.position.x - mx) + (pl.position.y - my)*(pl.position.y - my);
              if (dl < dist){
                  dist = dl;
                  p = pl.n;
              }
            }
          }
      }
    }
    return p;
  }

  distancingParticle(n){
    if (0<=n && n < this.particles.length){
      if (this.particles[n].s === 'IR' ||this.particles[n].s === 'IU' ){
        this.particles[n].isolated = true;
        this.particles[n].position.set(this.rc.x, this.rc.y);
        this.clickDistancingParticles.push(n)
        // this.particles[n].velocity.set(0, 0);
      }
    }
  }

  show(){
    fill(127);
    stroke(255);
    strokeWeight(2);
    rect(this.x, this.y, this.width,this.height)

    if (this.clickDistancingParticles.length >0){
      fill(200,150,150,100)
      ellipse(this.rc.x, this.rc.y, 2*this.distancingRadius, 2*this.distancingRadius)
    }
    for (let i = 0; i < this.particles.length; i++) {
      const p =  this.particles[i]
      // let vc = map(0.5*p.velocity.magSq(),0,this.kinEnergy,0,255);
      var c =[90, 90, 200, 200] //S
      if (p.s === 'E') c = [200,200,90,200] 
      if (p.s === 'IR') c = [200,90,90,200] 
      if (p.s === 'IU') c = [200,90,200,200] 
      if (p.s === 'R') c = [90,200,90,200] 
      if (p.s === 'D') c = [90,90,90,200] 
      p.show(c);
    }
    strokeWeight(0);
    fill(255);
    textAlign(LEFT,CENTER);

    let msg = 't='+this.t+' S=' + this.S.toFixed(1);
    msg = msg + ' E='+ this.E.toFixed(1);
    msg = msg + ' IR='+ this.IR.toFixed(1);
    msg = msg + ' IU='+ this.IU.toFixed(1);
    msg = msg + ' R='+ this.R.toFixed(1);
    msg = msg + ' D='+ this.D.toFixed(1);
    text(msg, this.x+10,this.height+20)


    // strokeWeight(1);
    // stroke(255,0,0, 50);
    // for (let i = 0; i < this.nCellsX; i++){
    //   line(this.x + i*this.cellWidth, this.y, this.x + i*this.cellWidth, this.y+this.height);
    // }
    // for (let i = 0; i < this.nCellsX; i++){
    //   line(this.x, this.y+i*this.cellWidth, this.x+this.width, this.y+i*this.cellWidth);
    // }

    // strokeWeight(0);
    // fill(255,0,0,150);
    // textAlign(CENTER,CENTER);
    // for (let i = 0; i < this.nCellsX; i++){
    //     for (let j = 0; j < this.nCellsX; j++){
    //       let x = (j+1)*this.cellWidth;
    //       let y = (i+1)*this.cellWidth;
    //       let c = j + i*this.nCellsX
    //       text(''+c, x,y)
    //     }
    // }


  }
}

// particle class
  class Particle{
    constructor(x, y, diam=25){
      // all in pixel units
      this.position = createVector(x, y);
      this.velocity = createVector(0.0, 0.0);
      this.acceleration = createVector(0.0, 0.0);
      this.diam = diam;
      this.s = 'S';
      this.timeHealing = 0;
      this.timeIncubation = 0;
      this.cell = -1;
      this.next = -1;
      this.n = -1;
      this.isolated = false;
      // this.beta = 0.2;
      // this.phi = 0.1;
      // this.alpha0 = 0.15;
      // this.mu = 0.5;
      // this.incubationPeriod = 100;
      // this.infectionPeriod = 300;
    }

    setVelocity(vx,vy){
      this.velocity.x = vx;
      this.velocity.y = vy;
    }

    show(c){

      fill(c);
      strokeWeight(1);
      stroke(0);
      ellipse(this.position.x, this.position.y, this.diam, this.diam);
      
      // strokeWeight(0);
      // fill(0);
      // textAlign(CENTER,CENTER);
      // text(''+this.cell,this.position.x, this.position.y+5)
      // text(''+this.n,this.position.x, this.position.y)
    }

  }