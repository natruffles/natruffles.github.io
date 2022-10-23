// ------------------------------------------------------------
// Creating A Snake Game Tutorial With HTML5
// Copyright (c) 2015 Rembound.com
// 
// This program is free software: you can redistribute it and/or modify  
// it under the terms of the GNU General Public License as published by  
// the Free Software Foundation, either version 3 of the License, or  
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,  
// but WITHOUT ANY WARRANTY; without even the implied warranty of  
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the  
// GNU General Public License for more details.  
// 
// You should have received a copy of the GNU General Public License  
// along with this program.  If not, see http://www.gnu.org/licenses/.
//
// http://rembound.com/articles/creating-a-snake-game-tutorial-with-html5
// ------------------------------------------------------------

// The function gets called when the window is fully loaded
window.onload = function() {
    //load sounds
    let endSound = new Audio('assets/end.mp3');
    let playEndCommand = false;
    let correctSound = new Audio('assets/correctState.mp3');
    let playCorrectStateCommand = false;
    let incorrectSound = new Audio('assets/incorrectState.mp3');
    let playIncorrectStateCommand = false;

    //initializes the array of 50 states 
    const states = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", 
    "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", 
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", 
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", 
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
    "Wisconsin", "Wyoming"];

    let conqueredStates = ["Ohio"];  //add "Ohio" in here
    let stateToConquer = "";
    let numOfStatesToRender = 3;
    let incorrectStatePositions = new Array(numOfStatesToRender - 1).fill([0, 0, ""]);

    let incorrectStateFlag = false;
    let incorrectStateName = "";
    let lastRenderTime = 0;
    let secondsSinceStart = 0;

    // Get the canvas and context 
    var canvas = document.getElementById("viewport");
    var context = canvas.getContext("2d");

    var diagnosticScreen = document.getElementById("diagnostic");
    var diagnosticContext = diagnosticScreen.getContext("2d");

    
    // Timing and frames per second
    var lastframe = 0;
    var fpstime = 0;
    var framecount = 0;
    var fps = 0;
    
    var initialized = false;
    
    // Images
    var images = [];
    var tileimage;
    
    // Image loading global variables
    var loadcount = 0;
    var loadtotal = 0;
    var preloaded = false;
    
    // Load images
    function loadImages(imagefiles) {
        // Initialize variables
        loadcount = 0;
        loadtotal = imagefiles.length;
        preloaded = false;
        
        // Load the images
        var loadedimages = [];
        for (var i=0; i<imagefiles.length; i++) {
            // Create the image object
            var image = new Image();
            
            // Add onload event handler
            image.onload = function () {
                loadcount++;
                if (loadcount == loadtotal) {
                    // Done loading
                    preloaded = true;
                }
            };
            
            // Set the source url of the image
            image.src = imagefiles[i];
            
            // Save to the image array
            loadedimages[i] = image;
        }
        
        // Return an array of images
        return loadedimages;
    }
    
    // Level properties
    var Level = function (columns, rows, tilewidth, tileheight) {
        this.columns = columns;
        this.rows = rows;
        this.tilewidth = tilewidth;
        this.tileheight = tileheight;
        
        // Initialize tiles array
        this.tiles = [];
        for (var i=0; i<this.columns; i++) {
            this.tiles[i] = [];
            for (var j=0; j<this.rows; j++) {
                this.tiles[i][j] = 0;
            }
        }
    };
    
    // Generate a default level with walls
    Level.prototype.generate = function() {
        for (var i=0; i<this.columns; i++) {
            for (var j=0; j<this.rows; j++) {
                if (i == 0 || i == this.columns-1 ||
                    j == 0 || j == this.rows-1) {
                    // Add walls at the edges of the level
                    this.tiles[i][j] = 1;
                } else {
                    // Add empty space
                    this.tiles[i][j] = 0;
                }
            }
        }
    };
    
    
    // Snake
    var Snake = function() {
        this.init(0, 0, 1, 10, 1);
    }
    
    // Direction table: Up, Right, Down, Left
    Snake.prototype.directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    
    // Initialize the snake at a location
    Snake.prototype.init = function(x, y, direction, speed, numsegments) {
        this.x = x;
        this.y = y;
        this.direction = direction; // Up, Right, Down, Left
        this.speed = speed;         // Movement speed in blocks per second
        this.movedelay = 0;
        
        // Reset the segments and add new ones
        this.segments = [];
        this.growsegments = 0;
        for (var i=0; i<numsegments; i++) {
            this.segments.push({x:this.x - i*this.directions[direction][0],
                                y:this.y - i*this.directions[direction][1]});
        }
    }
    
    // Increase the segment count
    Snake.prototype.grow = function() {
        this.growsegments++;
    };
    
    // Check we are allowed to move
    Snake.prototype.tryMove = function(dt) {
        this.movedelay += dt;
        if (!incorrectStateFlag) {
            var maxmovedelay = 1 / this.speed;
        }
        else {
            var maxmovedelay = 1000 / this.speed;
        }
        if (this.movedelay > maxmovedelay) {
            return true;
        }
        return false;
    };
    
    // Get the position of the next move
    Snake.prototype.nextMove = function() {
        var nextx = this.x + this.directions[this.direction][0];
        var nexty = this.y + this.directions[this.direction][1];
        return {x:nextx, y:nexty};
    }
    
    // Move the snake in the direction
    Snake.prototype.move = function() {
        // Get the next move and modify the position
        var nextmove = this.nextMove();
        this.x = nextmove.x;
        this.y = nextmove.y;
    
        // Get the position of the last segment
        var lastseg = this.segments[this.segments.length-1];
        var growx = lastseg.x;
        var growy = lastseg.y;
    
        // Move segments to the position of the previous segment
        for (var i=this.segments.length-1; i>=1; i--) {
            this.segments[i].x = this.segments[i-1].x;
            this.segments[i].y = this.segments[i-1].y;
        }
        
        // Grow a segment if needed
        if (this.growsegments > 0) {
            this.segments.push({x:growx, y:growy});
            this.growsegments--;
        }
        
        // Move the first segment
        this.segments[0].x = this.x;
        this.segments[0].y = this.y;
        
        // Reset movedelay
        this.movedelay = 0;
    }

    // Create objects
    var snake = new Snake();
    var level = new Level(30, 14, 48, 48);
    
    // Variables
    var gameover = true;        // Game is over
    var gameovertime = 1;       // How long we have been game over
    var gameoverdelay = 0.5;    // Waiting time after game over
    
    // Initialize the game
    function init() {
        // Load images
        images = loadImages(["assets/snakeSprite.png"]);
        tileimage = images[0];
        images = loadImages(["assets/stateSprite.png"]);
        stateimage = images[0];
        images = loadImages(["assets/mapBackground.png"]);
        mapimage = images[0];
    
        // Add mouse events
        canvas.addEventListener("mousedown", onMouseDown);
        
        // Add keyboard events
        document.addEventListener("keydown", onKeyDown);
        
        // New game
        newGame();
        gameover = true;
    
        // Enter main loop
        main(0);
    }
    
    // Check if we can start a new game
    function tryNewGame() {
        if (gameovertime > gameoverdelay) {
            newGame();
            gameover = false;
        }
    }
    
    function newGame() {
        // Initialize the snake
        snake.init(10, 10, 1, 10, 4);
        
        // Generate the default level
        level.generate();

        //resets array of conquered states
        conqueredStates = ["Ohio"];
        
        //display a new state name
        stateToConquer = displayState();

        //reset the incorrect state positions to each be in [0,0]
        //will immediately be overwritten in the addStates function below
        //incorrectStatePositions = new Array(numOfStatesToRender - 1).fill([0, 0]);

        // Add states and incorrect states
        addStates(stateToConquer, numOfStatesToRender);

        // Initialize variables
        gameover = false;
    }

    //display the states you conquered when the game ends:
    function displayConqueredStates() {
        let conqueredString = "Conquered States: ";
        for (let i = 0; i < conqueredStates.length; i ++) {
            if (i < conqueredStates.length - 1) {
                conqueredString = conqueredString.concat(conqueredStates[i] + ", ");
            } else {
                conqueredString = conqueredString.concat(conqueredStates[i] + "! Great job!");
            }
        }

        diagnosticScreen.height = conqueredStates.length * 100 + 100;
        //set the text color 
        diagnosticContext.fillStyle = "#353535";
        diagnosticContext.fillRect(0, 0, diagnosticScreen.width, diagnosticScreen.height);

        //set text parameters
        diagnosticContext.fillStyle = "#ffffff";
        diagnosticContext.font = "bold 24px Times";
        drawCenterTextDiag("Check below to view your conquest!", 0, 50, diagnosticScreen.width);

        let text = "";
        let tileNum = 0;
        let Tx = 0;
        let Ty = 0;
        let textdim = null;
        
        for (let j = 0; j < conqueredStates.length; j++) {
            text = conqueredStates[j] + ":";
            textdim = diagnosticContext.measureText(text);
            diagnosticContext.fillText(text, diagnostic.width/2-30-textdim.width, 150 + 100*j);
            tileNum = determineCorrectTileNumber(conqueredStates[j]);
            [Tx, Ty] = drawStateOnGameBoard(tileNum, 0, 0, true);
            diagnosticContext.drawImage(stateimage, Tx*64, Ty*64, 64, 64, diagnostic.width/2 + 20, 115 + 100*j, 64, 64);
        }

        //display credits
        let link = document.querySelector("p");
        link.innerHTML = `<a href="https://devpost.com/software/ohsnake" target="_blank">about</a>`;
    }

    //display a new state name whenever an apple is added
    function displayState() {

        //get random state name 
        let stateName = getRandomStateName();
        //check if state has already been conquered, get new state
        while (conqueredStates.includes(stateName)) {
            stateName = getRandomStateName();
        }  

        //remove credits while playing the game
        let link = document.querySelector("p");
        link.innerHTML = ``;
        diagnosticScreen.height = 50;
        //set the text color 
        diagnosticContext.fillStyle = "#353535";
        diagnosticContext.fillRect(0, 0, diagnosticScreen.width, diagnosticScreen.height);

        //draw text on the diagnosticScreen
        diagnosticContext.fillStyle = "#ffffff";
        diagnosticContext.font = "bold 24px Times";
        drawCenterTextDiag("State to Conquer: " + stateName, 0, diagnosticScreen.height/2, diagnosticScreen.width);

        return stateName;
    }

    //gets a random state name from array of states
    function getRandomStateName() {
        return states[Math.floor(Math.random() * states.length)];
    }

    //adds the stateName to the conqueredStates array
    function conquerState() {
        conqueredStates.push(stateToConquer);
    }

    //gets percentage of US conquered
    function getConquerPercentage() {
        return Math.round((conqueredStates.length / states.length) * 100);
    }


    // Add states to the level at an empty position
    function addStates(stateName, numOfStates) {
        let correctStateNum = 0;

        for (let z = 0; z < numOfStates; z++) {
            // Loop until we have a valid state
            var valid = false;
            while (!valid) {
                // Get a random position
                var ax = randRange(0, level.columns-1);
                var ay = randRange(0, level.rows-1);
                
                // Make sure the snake doesn't overlap the new state
                var overlap = false;
                for (var i=0; i<snake.segments.length; i++) {
                    // Get the position of the current snake segment
                    var sx = snake.segments[i].x;
                    var sy = snake.segments[i].y;
                    
                    // Check overlap
                    if (ax == sx && ay == sy) {
                        overlap = true;
                        break;
                    }
                }
                // Tile must be empty
                if (!overlap && level.tiles[ax][ay] == 0) {
                    // Add correct state at the tile position
                    if (z == 0) {
                        correctStateNum = determineCorrectTileNumber(stateName);
                        level.tiles[ax][ay] = correctStateNum;
                    } 
                    // add incorrect states at other tile positions
                    else {
                        level.tiles[ax][ay] = determineIncorrectTileNumber(correctStateNum);
                        let incorrectStateNameQ = states[level.tiles[ax][ay] - 2];
                        incorrectStatePositions[z-1] = [ax, ay, incorrectStateNameQ];
                    }
                    valid = true;
                }
            }
        }
    }

    //based on the name of the correct state, determine the tile number 
    function determineCorrectTileNumber(nameOfState) {
        //if tileNum is 2-51, is good
        //if its 1, then the findIndex didn't work
        for (let i = 0; i < states.length; i++) {
            if (nameOfState == states[i]) {
                return i + 2;
            }
        }
        console.log("Error! tile not found!");
        return 1;
    }

    //determine random tile numbers for incorrect states to be displayed
    function determineIncorrectTileNumber(dontPickThisState) {
        let tileNum = randRange(2, states.length + 1);
        while (tileNum == dontPickThisState) {
            tileNum = randRange(2, states.length + 1);
        }
        return tileNum;
    }


    // Main loop
    function main(tframe) {
        // Request animation frames
        window.requestAnimationFrame(main);

        if (!initialized) {
            if (preloaded) {
                initialized = true;
            }
        } else {
            // Update and render the game
            update(tframe);
            playSounds();
            render();
        }
    }
    
    // Update the game state
    function update(tframe) {
        var dt = (tframe - lastframe) / 1000;
        lastframe = tframe;
        
        // Update the fps counter
        updateFps(dt);
        
        if (!gameover) {
            updateGame(dt);
        } else {
            gameovertime += dt;
        }
    }
    
    function updateGame(dt) {
        // Move the snake
        if (snake.tryMove(dt)) {
            // Check snake collisions
            
            // Get the coordinates of the next move
            var nextmove = snake.nextMove();
            var nx = nextmove.x;
            var ny = nextmove.y;
            
            if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
                if (level.tiles[nx][ny] == 1) {
                    // Collision with a wall
                    gameover = true;
                }
                
                // Collisions with the snake itself
                for (var i=0; i<snake.segments.length; i++) {
                    var sx = snake.segments[i].x;
                    var sy = snake.segments[i].y;
                    
                    if (nx == sx && ny == sy) {
                        // Found a snake part
                        gameover = true;
                    }
                }
                
                if (!gameover) {
                    // The snake is allowed to move

                    // Move the snake
                    snake.move();
                    
                    // Check collision with a state
                    if (level.tiles[nx][ny] >= 2) {

                        //remove the state
                        level.tiles[nx][ny] = 0;
                        
                        let incorrectState = false;

                        for (let i = 0; i < incorrectStatePositions.length; i++) {
                            if (nx == incorrectStatePositions[i][0] && ny == incorrectStatePositions[i][1]) {
                                incorrectStateName = incorrectStatePositions[i][2];
                                incorrectState = true;
                            }
                        }

                        //check if incorrect state
                        if (incorrectState) {

                            //will flash the screen red elsewhere, freeze the snake for 1 second
                            incorrectStateFlag = true;



                            //play incorrect noise
                            playIncorrectStateCommand = true;
                        }

                        //check if correct state
                        else {
                            //play incorrect noise
                            playCorrectStateCommand = true;

                            //remove the other 2 states
                            for (let i = 0; i < incorrectStatePositions.length; i++) {
                                level.tiles[incorrectStatePositions[i][0]][incorrectStatePositions[i][1]] = 0;
                            }

                            //add state to conquered list
                            conquerState();

                            if (conqueredStates.length >= states.length) {
                                gameover = true;
                                return;
                            }

                            //display a new state name
                            stateToConquer = displayState();
                        
                            // Add new states
                            addStates(stateToConquer, numOfStatesToRender);
                        
                            // Grow the snake
                            snake.grow();
                        }
                    }

                }
            } else {
                // Out of bounds
                gameover = true;
            }
            
            if (gameover) {
                gameovertime = 0;
                playEndCommand = true;
            }
        }
    }
    
    function updateFps(dt) {
        if (fpstime > 0.25) {
            // Calculate fps
            fps = Math.round(framecount / fpstime);
            
            // Reset time and framecount
            fpstime = 0;
            framecount = 0;
        }
        
        // Increase time and framecount
        fpstime += dt;
        framecount++;
    }
    
    // Render the game
    function render() {
        // Draw background of canvas
        context.fillStyle = "#353535";
        context.fillRect(0, 0, canvas.width, canvas.height);

        //draw map background
        context.drawImage(mapimage, 0, 0);

        drawLevel();
        drawSnake();

        //flash screen red if incorrect state
        if (incorrectStateFlag) {
            context.fillStyle = "rgba(255, 0, 0, 0.3)";
            setTimeout(() => {  context.fillStyle = "rgba(0, 0, 0, 0)"; }, 1000);
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.fillStyle = "#000000";
            context.font = "bold 48px Times";
            drawCenterText("You can't conquer " + incorrectStateName + "!", 0, canvas.height/2, canvas.width);
            setTimeout(() => {  context.fillStyle = "rgba(0, 0, 0, 0)"; }, 1000);
            setTimeout(() => { context.fillRect(0, 0, canvas.width, canvas.height); }, 1000);

            setTimeout(() => {  incorrectStateFlag = false; }, 1000);
        }

        
            
        // Game over
        if (gameover) {
            //display conquered states
            displayConqueredStates();

            //context.fillStyle = "rgba(0, 0, 0, 0.5)";
            //context.fillRect(0, 0, canvas.width, canvas.height);
            
            context.fillStyle = "#000000";
            context.font = "bold 48px Times";
            if (conqueredStates.length >= states.length) {
                drawCenterText("CONGRATS! Ohio conquered the USA!", 0, canvas.height/2, canvas.width);
            } else {
                drawCenterText("Percentage of US Conquered by Ohio: " + getConquerPercentage() + "%", 0, canvas.height/2 - 60, canvas.width);
                drawCenterText("Wanna increase that number?", 0, canvas.height/2, canvas.width);
                drawCenterText("Press any key to start!", 0, canvas.height/2 + 60, canvas.width);
            }
        }
    }

    function playSounds() {
        if (playEndCommand) {
            playEndCommand = false;
            endSound.play();
        }

        if (playCorrectStateCommand) {
            playCorrectStateCommand = false;
            correctSound.play();
        }

        if (playIncorrectStateCommand) {
            playIncorrectStateCommand = false;
            incorrectSound.play();
        }
    }
    
    // Draw the level tiles
    function drawLevel() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                // Get the current tile and location
                var tile = level.tiles[i][j];
                var tilex = i*level.tilewidth;
                var tiley = j*level.tileheight;
                
                // Draw tiles based on their type
                if (tile == 0) {
                    // Empty space
                    //context.fillStyle = "#f7e697";
                    //context.fillRect(tilex, tiley, level.tilewidth, level.tileheight);
                } else if (tile == 1) {
                    // Wall
                    //context.fillStyle = "#bcae76";
                    //context.fillRect(tilex, tiley, level.tilewidth, level.tileheight);
                } else if (tile >= 2) {
                    // State
                    drawStateOnGameBoard(tile, tilex, tiley);
                }
            }
        }
    }

    //If tile type is 2 or greater, draw the state based on tileNum
    function drawStateOnGameBoard(tileNum, tilex, tiley, onlygetTxandTy = false) {
        var tx = 0;
        var ty = 0;

        // Draw the state image
        switch(tileNum) {
            // alabama
            case 2:
                //add tx and ty to EACH of these cases
                tx = 0;
                ty = 0;
                break;
            // 
            case 3:
                //add tx and ty to EACH of these cases
                tx = 1;
                ty = 0;
                break;
            // 
            case 4:
                //add tx and ty to EACH of these cases
                tx = 2;
                ty = 0;
                break;
            // 
            case 5:
                //add tx and ty to EACH of these cases
                tx = 3;
                ty = 0;
                break;
            // 
            case 6:
                //add tx and ty to EACH of these cases
                tx = 4;
                ty = 0;
                break;
            // 
            case 7:
                //add tx and ty to EACH of these cases
                tx = 5;
                ty = 0;
                break;
            // 
            case 8:
                //add tx and ty to EACH of these cases
                tx = 6;
                ty = 0;
                break;
            // 
            case 9:
                //add tx and ty to EACH of these cases
                tx = 7;
                ty = 0;
                break;
            // 
            case 10:
                //add tx and ty to EACH of these cases
                tx = 0;
                ty = 1;
                break;
            // 
            case 11:
                //add tx and ty to EACH of these cases
                tx = 1;
                ty = 1;
                break;
            // 
            case 12:
                //add tx and ty to EACH of these cases
                tx = 2;
                ty = 1;
                break;
            // 
            case 13:
                //add tx and ty to EACH of these cases
                tx = 3;
                ty = 1;
                break;
            // 
            case 14:
                //add tx and ty to EACH of these cases
                tx = 4;
                ty = 1;
                break;
            // 
            case 15:
                //add tx and ty to EACH of these cases
                tx = 5;
                ty = 1;
                break;
            // 
            case 16:
                //add tx and ty to EACH of these cases
                tx = 6;
                ty = 1;
                break;
            // 
            case 17:
                //add tx and ty to EACH of these cases
                tx = 7;
                ty = 1;
                break;
            // 
            case 18:
                //add tx and ty to EACH of these cases
                tx = 0;
                ty = 2;
                break;
            // 
            case 19:
                //add tx and ty to EACH of these cases
                tx = 1;
                ty = 2;
                break;
            // 
            case 20:
                //add tx and ty to EACH of these cases
                tx = 2;
                ty = 2;
                break;
            // 
            case 21:
                //add tx and ty to EACH of these cases
                tx = 3;
                ty = 2;
                break;
            // 
            case 22:
                //add tx and ty to EACH of these cases
                tx = 4;
                ty = 2;
                break;
            // 
            case 23:
                //add tx and ty to EACH of these cases
                tx = 5;
                ty = 2;
                break;
            // 
            case 24:
                //add tx and ty to EACH of these cases
                tx = 6;
                ty = 2;
                break;
            // 
            case 25:
                //add tx and ty to EACH of these cases
                tx = 7;
                ty = 2;
                break;
            // 
            case 26:
                //add tx and ty to EACH of these cases
                tx = 0;
                ty = 3;
                break;
            // 
            case 27:
                //add tx and ty to EACH of these cases
                tx = 1;
                ty = 3;
                break;
            // 
            case 28:
                //add tx and ty to EACH of these cases
                tx = 2;
                ty = 3;
                break;
            // 
            case 29:
                //add tx and ty to EACH of these cases
                tx = 3;
                ty = 3;
                break;
            // 
            case 30:
                //add tx and ty to EACH of these cases
                tx = 4;
                ty = 3;
                break;
            // 
            case 31:
                //add tx and ty to EACH of these cases
                tx = 5;
                ty = 3;
                break;
            // 
            case 32:
                //add tx and ty to EACH of these cases
                tx = 6;
                ty = 3;
                break;
            // 
            case 33:
                //add tx and ty to EACH of these cases
                tx = 7;
                ty = 3;
                break;
            // 
            case 34:
                //add tx and ty to EACH of these cases
                tx = 0;
                ty = 4;
                break;
            // 
            case 35:
                //add tx and ty to EACH of these cases
                tx = 1;
                ty = 4;
                break;
            // 
            case 36:
                //add tx and ty to EACH of these cases
                tx = 2;
                ty = 4;
                break;
            // 
            case 37:
                //add tx and ty to EACH of these cases
                tx = 3;
                ty = 4;
                break;
            // 
            case 38:
                //add tx and ty to EACH of these cases
                tx = 4;
                ty = 4;
                break;
            // 
            case 39:
                //add tx and ty to EACH of these cases
                tx = 5;
                ty = 4;
                break;
            // 
            case 40:
                //add tx and ty to EACH of these cases
                tx = 6;
                ty = 4;
                break;
            // 
            case 41:
                //add tx and ty to EACH of these cases
                tx = 7;
                ty = 4;
                break;
            // 
            case 42:
                //add tx and ty to EACH of these cases
                tx = 0;
                ty = 5;
                break;
            // 
            case 43:
                //add tx and ty to EACH of these cases
                tx = 1;
                ty = 5;
                break;
            // 
            case 44:
                //add tx and ty to EACH of these cases
                tx = 2;
                ty = 5;
                break;
            // 
            case 45:
                //add tx and ty to EACH of these cases
                tx = 3;
                ty = 5;
                break;
            // 
            case 46:
                //add tx and ty to EACH of these cases
                tx = 4;
                ty = 5;
                break;
            // 
            case 47:
                //add tx and ty to EACH of these cases
                tx = 5;
                ty = 5;
                break;
            // 
            case 48:
                //add tx and ty to EACH of these cases
                tx = 6;
                ty = 5;
                break;
            // 
            case 49:
                //add tx and ty to EACH of these cases
                tx = 7;
                ty = 5;
                break;
            case 50:
                //add tx and ty to EACH of these cases
                tx = 0;
                ty = 6;
                break;
            case 51:
                tx = 1;
                ty = 6;
                break;
        }

        if (onlygetTxandTy) {
            return [tx, ty];
        }
        var tilew = 64;
        var tileh = 64;
        context.drawImage(stateimage, tx*tilew, ty*tileh, tilew, tileh, tilex-16, tiley-16, level.tilewidth*1.5, level.tileheight*1.5);
    }
    
    // Draw the snake
    function drawSnake() {
        // Loop over every snake segment
        for (var i=0; i<snake.segments.length; i++) {
            var segment = snake.segments[i];
            var segx = segment.x;
            var segy = segment.y;
            var tilex = segx*level.tilewidth;
            var tiley = segy*level.tileheight;
            
            // Sprite column and row that gets calculated
            var tx = 0;
            var ty = 0;
            
            if (i == 0) {
                // Head; Determine the correct image
                var nseg = snake.segments[i+1]; // Next segment
                if (segy < nseg.y) {
                    // Up
                    tx = 0; ty = 0;
                } else if (segx > nseg.x) {
                    // Right
                    tx = 1; ty = 0;
                } else if (segy > nseg.y) {
                    // Down
                    tx = 1; ty = 1;
                } else if (segx < nseg.x) {
                    // Left
                    tx = 0; ty = 1;
                }
            } else if (i == snake.segments.length-1) {
                // Tail; Determine the correct image
                var pseg = snake.segments[i-1]; // Prev segment
                if (pseg.y < segy) {
                    // Up
                    tx = 3; ty = 1;
                } else if (pseg.x > segx) {
                    // Right
                    tx = 3; ty = 0;
                } else if (pseg.y > segy) {
                    // Down
                    tx = 2; ty = 0;
                } else if (pseg.x < segx) {
                    // Left
                    tx = 2; ty = 1;
                }
            } else {
                // Body; Determine the correct image
                var pseg = snake.segments[i-1]; // Previous segment
                var nseg = snake.segments[i+1]; // Next segment
                if (pseg.x < segx && nseg.x > segx || nseg.x < segx && pseg.x > segx) {
                    // Horizontal Left-Right
                    tx = 2; ty = 3;
                } else if (pseg.y < segy && nseg.y > segy || nseg.y < segy && pseg.y > segy) {
                    // Vertical Up-Down
                    tx = 2; ty = 2;
                } else if (pseg.x < segx && nseg.y > segy || nseg.x < segx && pseg.y > segy) {
                    // Angle Left-Down
                    tx = 1; ty = 2;
                } else if (pseg.y < segy && nseg.x < segx || nseg.y < segy && pseg.x < segx) {
                    // Angle Top-Left
                    tx = 1; ty = 3;
                } else if (pseg.x > segx && nseg.y < segy || nseg.x > segx && pseg.y < segy) {
                    // Angle Right-Up
                    tx = 0; ty = 3;
                } else if (pseg.y > segy && nseg.x > segx || nseg.y > segy && pseg.x > segx) {
                    // Angle Down-Right
                    tx = 0; ty = 2;
                }
            }
            
            // Draw the image of the snake part
            context.drawImage(tileimage, tx*64, ty*64, 64, 64, tilex, tiley,
                              level.tilewidth, level.tileheight);
        }
    }
    
    // Draw text that is centered
    function drawCenterText(text, x, y, width) {
        var textdim = context.measureText(text);
        context.fillText(text, x + (width-textdim.width)/2, y);
    }

    // Draw text that is centered on diagnostic screen
    function drawCenterTextDiag(text, x, y, width) {
        var textdim = diagnosticContext.measureText(text);
        diagnosticContext.fillText(text, x + (width-textdim.width)/2, y);
    }
    
    // Get a random int between low and high, inclusive
    function randRange(low, high) {
        return Math.floor(low + Math.random()*(high-low+1));
    }
    
    // Mouse event handlers
    function onMouseDown(e) {
        // Get the mouse position
        var pos = getMousePos(canvas, e);
        
        if (gameover && conqueredStates.length >= states.length) {
        } else if (gameover) {
            tryNewGame();
        } else {
            // Change the direction of the snake
            snake.direction = (snake.direction + 1) % snake.directions.length;
        }
    }
    
    // Keyboard event handler
    function onKeyDown(e) {
        if (gameover && conqueredStates.length >= states.length) {
        } else if (gameover) {
            tryNewGame();
        } else {
            if (e.keyCode == 37 || e.keyCode == 65) {
                // Left or A
                if (snake.direction != 1)  {
                    snake.direction = 3;
                }
            } else if (e.keyCode == 38 || e.keyCode == 87) {
                // Up or W
                if (snake.direction != 2)  {
                    snake.direction = 0;
                }
            } else if (e.keyCode == 39 || e.keyCode == 68) {
                // Right or D
                if (snake.direction != 3)  {
                    snake.direction = 1;
                }
            } else if (e.keyCode == 40 || e.keyCode == 83) {
                // Down or S
                if (snake.direction != 0)  {
                    snake.direction = 2;
                }
            }
            
            // Grow for demonstration purposes
            if (e.keyCode == 32) {
                snake.grow();
            }
        }
    }
    
    // Get the mouse position
    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width),
            y: Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height)
        };
    }
    
    // Call init to start the game
    init();
};