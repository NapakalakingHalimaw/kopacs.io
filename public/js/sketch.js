function connect(username) {

  socket.auth = { username };
  socket.connect();
}

var selectedColor = 'black';
var selectedUtil = 'draw';
var selectedBrushSize = 15;

function drawClick() {
  if(socket.canDraw) {
    let data = {
      id: socket.id,
      username: socket.auth.username,
      x: mouseX,
      y: mouseY,
      type: selectedUtil,
      diameter: selectedBrushSize,
      color: selectedColor
    };

    socket.emit('mouse', data);
  }
}

function mouseDragged() {
  if(socket.canDraw) {
    let data = {
      id: socket.id,
      username: socket.auth.username,
      x: mouseX,
      y: mouseY,
      type: selectedUtil,
      diameter: selectedBrushSize,
      color: selectedColor
    };

    socket.emit('mouse', data);
  }
}

function draw() {

}

function windowResized() {
  if(document.getElementById('drawingDiv') === null)
    return;

  let drawingDiv = document.getElementById('drawingDiv');
  let width = drawingDiv.offsetWidth;
  let height = drawingDiv.offsetHeight;
  resizeCanvas(width, height*0.9);
  background(255);
}

function mouseWheel(event) {
  console.log(event.delta);
}

function clearCanvas() {
  clear();
  background(255);

  let data = {
    id: socket.id,
    username: socket.auth.username
  };

  socket.emit('clear', data);
}

function changeColor(color) {
  let data = {
    id: socket.id,
    username: socket.auth.username,
    type: 'color',
    color: color
  };

  socket.emit('change', data);
}

function changeUtil(util) {
  let data = {
    id: socket.id,
    username: socket.auth.username,
    type: 'util',
    util: util
  };

  socket.emit('change', data);
}

function changeBrushSize(size) {
  let data = {
    id: socket.id,
    username: socket.auth.username,
    type: 'brush_size',
    brushSize: size
  };

  socket.emit('change', data);
}

function sendGuess() {
  let data = {
    id: socket.id,
    username: socket.auth.username,
    guess: document.getElementById('user_guess').value
  }

  document.getElementById('user_guess').value = "";

  socket.emit('guess', data);
}

function selectWord(word) {
  let data = {
    id: socket.id,
    username: socket.auth.username,
    selectedWord: word
  };

  if(document.getElementById('word') !== null)
    document.getElementById('word').innerHTML = word;

  document.getElementById('overlay').remove();

  socket.emit('word', data);
}

function createTools() {
  let toolsDiv = document.createElement("div");
  toolsDiv.setAttribute('id', 'tools');
  toolsDiv.classList.add("toolsDiv");

  let colors = document.createElement("div");
  colors.setAttribute('id', 'colors');
  colors.style.display = "inline-block";

  let colArr = ['black', 'white', '#999999', '#696969', 'red', '#800000', 'orange', 'yellow', 'lime', 'green', 'dodgerblue', 'blue', 'magenta', 'purple', 'pink', 'brown'];
  for (var i = 0; i < colArr.length; i++) {
    let color = document.createElement("div");
    color.style.width = "20px";
    color.style.height = "20px";
    color.style.display = "inline-block";
    color.style.backgroundColor = colArr[i];
    color.setAttribute('onclick', 'changeColor(this.style.backgroundColor)');
    colors.appendChild(color);
  }

  let utils = document.createElement("div");
  utils.setAttribute('id', 'utils');
  utils.style.display = "inline-block";

  let utils_draw = document.createElement("div");
  utils_draw.setAttribute('onclick', 'changeUtil("draw")');
  utils_draw.setAttribute('title', 'Draw');
  utils_draw.style.display = "inline-block";
  utils_draw.style.textAlign = "center";
  utils_draw.style.width = "40px";
  utils_draw.style.height = "40px";
  utils_draw.style.backgroundColor = "white";

  let utils_draw_img = document.createElement("img");
  utils_draw_img.src = "images/draw.png";
  utils_draw_img.style.width = "80%";
  utils_draw_img.style.height = "80%";
  utils_draw.appendChild(utils_draw_img);

  let utils_erase = document.createElement("div");
  utils_erase.setAttribute('onclick', 'changeUtil("erase")');
  utils_erase.setAttribute('title', 'Erase');
  utils_erase.style.display = "inline-block";
  utils_erase.style.textAlign = "center";
  utils_erase.style.width = "40px";
  utils_erase.style.height = "40px";
  utils_erase.style.backgroundColor = "white";

  let utils_erase_img = document.createElement("img");
  utils_erase_img.src = "images/eraser.png";
  utils_erase_img.style.width = "80%";
  utils_erase_img.style.height = "80%";
  utils_erase.appendChild(utils_erase_img);

  let utils_fill = document.createElement("div");
  utils_fill.setAttribute('onclick', 'changeUtil("fill")');
  utils_fill.setAttribute('title', 'Fill');
  utils_fill.style.display = "inline-block";
  utils_fill.style.textAlign = "center";
  utils_fill.style.width = "40px";
  utils_fill.style.height = "40px";
  utils_fill.style.backgroundColor = "white";

  let utils_fill_img = document.createElement("img");
  utils_fill_img.src = "images/fill.png";
  utils_fill_img.style.width = "80%";
  utils_fill_img.style.height = "80%";
  utils_fill.appendChild(utils_fill_img);

  utils.appendChild(utils_draw);
  utils.appendChild(utils_erase);
  utils.appendChild(utils_fill);

  let brushes = document.createElement("div");
  brushes.setAttribute('id', 'brushes');
  brushes.style.display = "inline-block";

  let brushSizes = [{ type: 'small', value: 5 }, { type: 'medium', value: 15 }, { type: 'big', value: 30 }];
  for (var i = 0; i < brushSizes.length; i++) {
    let brush = document.createElement("div");
    brush.style.display = "inline-block";
    brush.style.width = "40px";
    brush.style.height = "40px";
    brush.style.backgroundColor = "white";
    brush.setAttribute('onclick', 'changeBrushSize(' + brushSizes[i].value + ')');
    brush.setAttribute('title', brushSizes[i].type);
    brushes.appendChild(brush);
  }

  toolsDiv.appendChild(colors);
  toolsDiv.appendChild(utils);
  toolsDiv.appendChild(brushes);

  return toolsDiv;
}
