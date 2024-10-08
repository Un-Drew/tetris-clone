GameRows = 20;
GameColumns = 10;

GameRowsExtended = GameRows + 0.5;
GameAspectRatio = GameColumns / GameRowsExtended;

BlockColors = [
	"rgb(255,0,0)",
	"rgb(255,128,0)",
	"rgb(255,255,0)",
	"rgb(0,255,0)",
	"rgb(0,255,255)",
	"rgb(50,50,255)",
	"rgb(128,0,255)"
];

// The game matrix is mirrored upside down, so, for the sake of consistency, these are also mirrored.
Pieces = [
	// Z piece (red)
	[
		[-1,-1,-1],
		[-1, 0, 0],
		[ 0, 0,-1]
	],
	// L piece (orange)
	[
		[-1,-1,-1],
		[ 1, 1, 1],
		[-1,-1, 1]
	],
	// O piece (yellow)
	[
		[ 2, 2],
		[ 2, 2]
	],
	// S piece (green)
	[
		[-1,-1,-1],
		[ 3, 3,-1],
		[-1, 3, 3]
	],
	// I piece (cyan)
	[
		[-1,-1,-1,-1],
		[-1,-1,-1,-1],
		[ 4, 4, 4, 4],
		[-1,-1,-1,-1],
	],
	// J piece (blue)
	[
		[-1,-1,-1],
		[ 5, 5, 5],
		[ 5,-1,-1]
	],
	// T piece (purple)
	[
		[-1,-1,-1],
		[ 6, 6, 6],
		[-1, 6,-1]
	]
];

// "Super Rotation" diagrams
SuperRotDiags = [];
// For pieces of size 2.
SuperRotDiags[0] = undefined;	// The only 2-sized piece is the square piece. No reason to rotate that one.
// For pieces of size 3
SuperRotDiags[1] = [
	// North
	[[0,0],[0,0],[0,0],[0,0]],
	// East
	[[1,0],[1,-1],[0,2],[1,2]],
	// South
	[[0,0],[0,0],[0,0],[0,0]],
	// West
	[[-1,0],[-1,-1],[0,2],[-1,2]]
];
// For pieces of size 4
SuperRotDiags[2] = [
	// North
	[[-1,0],[2,0],[-1,0],[2,0]],
	// East
	[[1,0],[1,0],[1,1],[1,-2]],
	// South
	[[2,0],[-1,0],[2,-1],[-1,-1]],
	// West
	[[0,0],[0,0],[0,-2],[0,1]]
];

Score = 0

Queue = [];
QueueSize = 6;
RandomBag = undefined;

HeldPiece = undefined;
HeldRotation = 0;
CanHoldRightNow = false;

CurrentPiece = undefined;
PieceDim = undefined;	// Piece dimentions (SolidStartX, SolidEndX, SolidStartY, SolidEndY)
PiecePosX = 0;
PiecePosY = 0;
FallTimer = 0.0;
bHasSpaceBelow = false;
LowestY = -1;
ExtendedMovesLeft = 0;
CurrentRotationDirection = 0;	// So we know which "Super Rotation" diagram to use.
IsFastFalling = false;

// Rows! (twice as many as defined. The extra space is called the "buffer zone")
Blocks = new Array(GameRows);
for (i = 0; i < GameRows * 2; i++) {
	// Columns!
	Blocks[i] = new Array(GameColumns);
	for (j = 0; j < GameColumns; j++) {
		// Block color on that space (-1 means empty).
		Blocks[i][j] = -1;
	}
}

GameState = -1;

const STATE_STARTING = 0;
const STATE_FALLING = 1;
const STATE_ANIMATEPRE = 2;
const STATE_ANIMATEPOST = 3;
const STATE_LOOPDELAY = 4;
const STATE_GAMEOVER = 5;

const STATE_DUR_STARTING = 2.0;
const STATE_DUR_ANIMATEPRE = 0.1;
const STATE_DUR_ANIMATEPOST = 0.25;
const STATE_DUR_LOOPDELAY = 0.2;

StateTimeLeft = 0.0;
GoToState_Starting();

ClearAnimPos = 0.0;
ClearAnimHeight = 0;

const canvas = document.getElementById("canvas");
const containing_div = document.getElementById("dimensiune");
const ctx = canvas.getContext("2d");
ScreenSafeZone = 0.95;

let FPS = 60;	// Frames per second
DeltaTime = 1 / FPS;

function Update() {
	Tick();

	/*
	 * I couldn't figure out how to make the canvas PROPERLY stretch to the rest of the screen
	 * (apparently CSS can't fully replace the size of an image/canvas), so I had to make an
	 * extra "div" whose sole purpose is to define the canvas size, which I'm applying here.
	 */
	ctx.canvas.width  = containing_div.clientWidth;
	ctx.canvas.height = containing_div.clientHeight;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (canvas.width > 0 && canvas.height > 0)
		Render();
}
setInterval(Update, 1000 / FPS);
Update();
console.log(ctx.canvas.width);

document.addEventListener('keydown', function(event) {
	if(event.keyCode == 37) {
		OnPressedLeft();
	}
	else if(event.keyCode == 39) {
		OnPressedRight();
	}
	else if (event.keyCode == 69) {
		OnPressedE();
	}
	else if (event.keyCode == 81) {
		OnPressedQ();
	}
	else if (event.keyCode == 40) {
		IsFastFalling = true;
	}
	else if (event.keyCode == 38) {
		OnPressedUp();
	}
});

document.addEventListener('keyup', function(event) {
	if (event.keyCode == 40) {
		IsFastFalling = false;
	}
});

function OnPressedLeft() {
	MovePieceLeft();
}

function OnPressedRight() {
	MovePieceRight();
}

function OnPressedE() {
	RotatePieceClockwise();
}

function OnPressedQ() {
	RotatePieceCounterclockwise();
}

function OnPressedUp() {
	HoldPiece();
}

function MovePieceLeft() {
	if (GameState !== STATE_FALLING || CurrentPiece === undefined) return;

	if (DoesPieceFit(CurrentPiece, PiecePosX - 1, PiecePosY)) {
		PiecePosX--;
		OnPlayerMoveUsed();
		OnMovementUpdated();
	}
}

function MovePieceRight() {
	if (GameState !== STATE_FALLING || CurrentPiece === undefined) return;

	if (DoesPieceFit(CurrentPiece, PiecePosX + 1, PiecePosY)) {
		PiecePosX++;
		OnPlayerMoveUsed();
		OnMovementUpdated();
	}
}

function RotatePieceClockwise() {
	if (GameState !== STATE_FALLING || CurrentPiece === undefined) return;

	let RotatedPiece = CloneArray(CurrentPiece);
	for (let py = 0; py < CurrentPiece.length; py++) {
		for (let px = 0; px < CurrentPiece[py].length; px++) {
			RotatedPiece[CurrentPiece.length - px - 1][py] = CurrentPiece[py][px];
		}
	}

	let RotationIdx = CurrentRotationDirection + 1;
	if (RotationIdx === 4)
		RotationIdx = 0;

	TryFinishRotation(RotatedPiece, RotationIdx);
}

function RotatePieceCounterclockwise() {
	if (GameState !== STATE_FALLING || CurrentPiece === undefined) return;

	let RotatedPiece = CloneArray(CurrentPiece);
	for (let py = 0; py < CurrentPiece.length; py++) {
		for (let px = 0; px < CurrentPiece[py].length; px++) {
			RotatedPiece[px][CurrentPiece.length - py - 1] = CurrentPiece[py][px];
		}
	}

	let RotationIdx = CurrentRotationDirection - 1;
	if (RotationIdx === -1)
		RotationIdx = 3;
	
	TryFinishRotation(RotatedPiece, RotationIdx);
}

function TryFinishRotation(RotatedPiece, RotationIdx) {
	let DiagrIdx = RotatedPiece.length - 2;
	let AmountOfOffsets = 0;
	if (DiagrIdx >= 0 && DiagrIdx < SuperRotDiags.length && SuperRotDiags[DiagrIdx] !== undefined) {
		AmountOfOffsets = SuperRotDiags[DiagrIdx][RotationIdx].length;
	}

	let MyPosX = 0;
	let MyPosY = 0;
	for (let Offset = -1; Offset < AmountOfOffsets; Offset++) {
		MyPosX = PiecePosX;
		MyPosY = PiecePosY;
		if (Offset !== -1) {
			MyPosX += SuperRotDiags[DiagrIdx][CurrentRotationDirection][Offset][0] - SuperRotDiags[DiagrIdx][RotationIdx][Offset][0];
			MyPosY += SuperRotDiags[DiagrIdx][CurrentRotationDirection][Offset][1] - SuperRotDiags[DiagrIdx][RotationIdx][Offset][1];
		}
		if (!DoesPieceFit(RotatedPiece, MyPosX, MyPosY)) continue;

		CurrentPiece = RotatedPiece;
		CurrentRotationDirection = RotationIdx;
		PieceDim = MakePieceSolidDimentions(CurrentPiece);
		PiecePosX = MyPosX;
		PiecePosY = MyPosY;
		OnPlayerMoveUsed();
		OnMovementUpdated();

		return true;
	}

	return false;
}

function HoldPiece() {
	if (GameState !== STATE_FALLING || CurrentPiece === undefined) return;
	if (!CanHoldRightNow) return;

	CanHoldRightNow = false;

	PrevHeldPiece = HeldPiece;
	HeldPiece = CurrentPiece;
	HeldRotation = CurrentRotationDirection;
	let Result = false;
	if (PrevHeldPiece === undefined) {
		Result = CreatePiece(CloneArray(Pieces[AdvanceQueue()]));
	}
	else {
		Result = CreatePiece(PrevHeldPiece);
		CurrentRotationDirection = HeldRotation;
	}

	if (Result)
		ResetFallState();
	else
		GoToState_GameOver();
}

function OnPlayerMoveUsed() {
	if (ExtendedMovesLeft > 0) {
		ExtendedMovesLeft--;
		LockDownTimer = GetLockDownDuration();
	}
}

function Tick() {
	switch (GameState) {
		case STATE_FALLING:   Tick_Falling();         break;
	}

	StateTimeLeft = Math.max(StateTimeLeft - DeltaTime, 0.0);
	if (StateTimeLeft == 0.0)
	{
		switch (GameState) {
			case STATE_STARTING:    GoToState_Falling();     break;
			case STATE_ANIMATEPRE:  GoToState_AnimatePost(); break;
			case STATE_ANIMATEPOST: GoToState_LoopDelay();   break;
			case STATE_LOOPDELAY:   GoToState_Falling();     break;
		}
	}
}

function GoToState_MainMenu() {
	GameState = STATE_MAINMENU;
}

function GoToState_Starting() {
	GameState = STATE_STARTING;
	StateTimeLeft = STATE_DUR_STARTING;

	InitQueue();
}

function GoToState_Falling() {
	GameState = STATE_FALLING;

	if (!CreatePiece(CloneArray(Pieces[AdvanceQueue()])))
	{
		GoToState_GameOver();
		return;
	}
	CanHoldRightNow = true;

	ResetFallState();
}

function ResetFallState() {
	FallTimer = GetFallTimerInterval();
	LockDownTimer = GetLockDownDuration();
	LowestY = -1;
	ExtendedMovesLeft = GetExtendedMoveCount();

	OnMovementUpdated();
}

function GoToState_AnimatePre() {
	GameState = STATE_ANIMATEPRE;
	StateTimeLeft = STATE_DUR_ANIMATEPRE;

	// Figure out if we need a clear animation, and if so, where it needs to be positioned.
	let First = -1;
	let Last = -1;
	let CanClear = true;
	for (let y = 0; y < GameRows * 2; y++) {
		CanClear = true;
		for (let x = 0; x < GameColumns; x++) {
			if (Blocks[y][x] === -1) {
				CanClear = false;
				break;
			}
		}
		if (CanClear) {
			if (First === -1)
				First = y;
		}
		else if (First !== -1) {
			Last = y;
			break;
		}
	}

	if (First === -1)
		GoToState_LoopDelay();
	else {
		if (Last === -1)
			Last = GameRows * 2;
		
		ClearAnimPos = (First + Last - 1) * 0.5;
		ClearAnimHeight = Last - First;
	}
}

function GoToState_AnimatePost() {
	GameState = STATE_ANIMATEPOST;
	StateTimeLeft = STATE_DUR_ANIMATEPOST;

	let NumberOfLines = 0;

	// Search for all completed lines, and actually clear them.
	let CanClear = true;
	for (let y = 0; y < GameRows * 2; y++) {
		CanClear = true;
		for (let x = 0; x < GameColumns; x++) {
			if (Blocks[y][x] === -1) {
				CanClear = false;
				break;
			}
		}
		if (CanClear) {
			for (let x = 0; x < GameColumns; x++) {
				Blocks[y][x] = -1;
			}
			NumberOfLines++;
		}
	}

	switch (NumberOfLines)
	{
		case 1: Score += 100; break;
		case 2: Score += 300; break;
		case 3: Score += 500; break;
		case 4: Score += 800; break;
	}
}

function GoToState_LoopDelay() {
	GameState = STATE_LOOPDELAY;
	StateTimeLeft = STATE_DUR_LOOPDELAY;

	// Search for all lines that are completely blank, and collapse them.
	let CanClear = true;
	let BlankSince = GameRows * 2;
	for (let y = GameRows * 2 - 1; y >= 0; y--) {
		CanClear = true;
		for (let x = 0; x < GameColumns; x++) {
			if (Blocks[y][x] !== -1) {
				CanClear = false;
				break;
			}
		}
		if (CanClear) {
			Blocks.splice(y, 1);
			BlankSince--;
		}
	}

	Blocks.length = GameRows * 2;
	
	for (let y = BlankSince; y < GameRows * 2; y++) {
		Blocks[y] = new Array(GameColumns);
		for (let x = 0; x < GameColumns; x++) {
			Blocks[y][x] = -1;
		}
	}
}

function GoToState_GameOver() {
	GameState = STATE_GAMEOVER;
}

function GoToState_EndResults() {
	GameState = STATE_ENDRESULTS;
}

function Tick_Falling() {
	if (bHasSpaceBelow) {
		FallTimer -= DeltaTime * (IsFastFalling ? 20.0 : 1.0);
		if (FallTimer <= 0.0) {
			FallTimer = Math.max(0.0, FallTimer + GetFallTimerInterval());
			PiecePosY -= 1;
			OnMovementUpdated();
		}
	}
	else {
		LockDownTimer = Math.max(LockDownTimer - DeltaTime, 0);
		if (LockDownTimer === 0.0 || ExtendedMovesLeft === 0) {
			for (let py = 0; py < CurrentPiece.length; py++) {
				for (let px = 0; px < CurrentPiece[py].length; px++) {
					if (CurrentPiece[py][px] === -1) continue;
					Blocks[PiecePosY + py][PiecePosX + px] = CurrentPiece[py][px];
				}
			}
			CurrentPiece = undefined;
			GoToState_AnimatePre();
		}
	}
}

function GetFallTimerInterval() {
	return 0.5;
}

function GetLockDownDuration() {
	return 0.5;
}

function GetExtendedMoveCount() {
	return 15;
}

// Returns an index in the "Pieces" list.
function AdvanceQueue() {
	let p_i = Queue[0];
	Queue.splice(0, 1);
	AddNewPieceToQueue();
	return p_i;
}

function InitRandomBag() {
	RandomBag = new Array(Pieces.length);
	for (i = 0; i < Pieces.length; i++) {
		RandomBag[i] = i;
	}
}

function InitQueue() {
	Queue.length = 0;
	for (i = 0; i < QueueSize; i++)
	{
		AddNewPieceToQueue();
	}
}

function AddNewPieceToQueue() {
	if (RandomBag == undefined || RandomBag.length == 0)
		InitRandomBag();
	let i = Math.floor(Math.random() * RandomBag.length);
	Queue.push(RandomBag[i]);
	RandomBag.splice(i, 1);
}

function CreatePiece(P) {
	PieceDim = MakePieceSolidDimentions(P);
	// Umm, there's nothing solid in this piece?
	if (PieceDim.SolidStartX === -1 || PieceDim.SolidEndY === -1) return false;

	PiecePosX = Math.floor((GameColumns - (PieceDim.SolidEndX - PieceDim.SolidStartX + 1)) * 0.5);
	PiecePosY = GameRows - PieceDim.SolidStartY;
	// The piece couldn't fit at the top, game over.
	if (!DoesPieceFit(P, PiecePosX, PiecePosY)) return false;
	CurrentPiece = P;
	CurrentRotationDirection = 0;

	return true;
}

function OnMovementUpdated() {
	bHasSpaceBelow = DoesPieceFit(CurrentPiece, PiecePosX, PiecePosY - 1);

	if (LowestY === -1 || LowestY > PiecePosY) {
		LowestY = PiecePosY;
		ExtendedMovesLeft = GetExtendedMoveCount();
	}

	if (!bHasSpaceBelow) FallTimer = GetFallTimerInterval();
}

function DoesPieceFit(P, x, y) {
	for (let py = 0; py < P.length; py++) {
		for (let px = 0; px < P[py].length; px++) {
			// This piece's block isn't solid, so skip it
			if (P[py][px] === -1) continue;
			// This block is outside the X range of the game table
			if (x + px < 0 || x + px >= GameColumns) return false;
			// This block is outside the Y range of the game table
			if (y + py < 0 || y + py >= GameRows * 2) return false;
			// A solid block is already here
			if (Blocks[y + py][x + px] !== -1)
			{
				return false;
			}
		}
	}
	return true;
}

function MakePieceSolidDimentions(P)
{
	let WasSolid = false;
	let R = {
		SolidStartX: -1,
		SolidEndX: -1,
		SolidStartY: -1,
		SolidEndY: -1
	};
	let SolidStartX = -1;
	let SolidEndX = 0;
	let SolidStartY = -1;
	let SolidEndY = 0;
	for (let py = 0; py < P.length; py++) {
		WasSolid = false;
		for (let px = 0; px < P[py].length; px++) {
			if (P[py][px] === -1) continue;
			WasSolid = true;
			if (R.SolidStartX === -1 || R.SolidStartX > px)
			R.SolidStartX = px;
			if (R.SolidEndX < px)
			R.SolidEndX = px;
		}
		if (!WasSolid) continue;
		if (R.SolidStartY === -1)
			R.SolidStartY = py;
		R.SolidEndY = py;
	}
	return R;
}

function Render() {
	SafeWidth = canvas.width * ScreenSafeZone;
	SafeHeight = canvas.height * ScreenSafeZone;
	SafeEdgeLeft = canvas.width * (1 - ScreenSafeZone) * 0.5;
	SafeEdgeRight = canvas.width - SafeEdgeLeft;
	SafeEdgeTop = canvas.height * (1 - ScreenSafeZone) * 0.5;
	SafeEdgeBottom = canvas.height - SafeEdgeTop;
	MiddleHor = canvas.width * 0.5;
	MiddleVer = canvas.height * 0.5;

	GameScale = Math.min(SafeWidth / (GameAspectRatio + 0.4), SafeHeight);
	CornerSpace = GameScale * 0.2;

	DrawGame();
}

function DrawGame() {
	let SizeX = Math.round(GameScale * GameAspectRatio);
	let SizeY = GameScale;
	let PosX = Math.round(MiddleHor - SizeX * 0.5);
	let PosY = Math.round(MiddleVer - SizeY * 0.5);

	let NextBox_X = PosX + SizeX;
	let NextBox_Y = PosY;
	NextBox_X += CornerSpace * 0.5;
	NextBox_Y += CornerSpace * 0.5;
	ctx.fillStyle = "#000000";
	drawCenter(NextBox_X, NextBox_Y, CornerSpace * 1.05, CornerSpace * 1.05);
	ctx.fillStyle = "#404040";
	drawCenter(NextBox_X, NextBox_Y, CornerSpace * 0.98, CornerSpace * 0.98);
	if (Queue[0] !== undefined)
	{
		let PieceSize = Pieces[Queue[0]].length;
		let TheBlockSize = CornerSpace * 0.8 / Math.max(3, PieceSize);
		DrawBlocks(Pieces[Queue[0]], NextBox_X - 0.5 * PieceSize * TheBlockSize, NextBox_Y + 0.5 * (PieceSize == 2 ? 2 : PieceSize + 1) * TheBlockSize, TheBlockSize, true);
	}
	ctx.strokeStyle = "#000000";
	ctx.fillStyle = "#FFFFFF";
	drawText(NextBox_X, PosY + CornerSpace * 0.05, CornerSpace * 0.2, "Next");

	let HoldBox_X = PosX;
	let HoldBox_Y = PosY;
	HoldBox_X -= CornerSpace * 0.5;
	HoldBox_Y += CornerSpace * 0.5;
	ctx.fillStyle = "#000000";
	drawCenter(HoldBox_X, HoldBox_Y, CornerSpace * 1.05, CornerSpace * 1.05);
	ctx.fillStyle = "#404040";
	drawCenter(HoldBox_X, HoldBox_Y, CornerSpace * 0.98, CornerSpace * 0.98);
	if (HeldPiece !== undefined)
	{
		let PieceSize = HeldPiece.length;
		let TheBlockSize = CornerSpace * 0.8 / Math.max(3, PieceSize);
		DrawBlocks(HeldPiece, HoldBox_X - 0.5 * PieceSize * TheBlockSize, HoldBox_Y + 0.5 * (PieceSize == 2 ? 2 : PieceSize + 1) * TheBlockSize, TheBlockSize, true);
	}
	ctx.strokeStyle = "#000000";
	ctx.fillStyle = "#FFFFFF";
	drawText(HoldBox_X, PosY + CornerSpace * 0.05, CornerSpace * 0.2, "Hold");

	ctx.fillStyle = "#202020";
	ctx.beginPath();
	ctx.rect(PosX, PosY, SizeX, SizeY);
	ctx.fill();
	ctx.closePath();

	ctx.save();

	// Masking (for the half-block screen extension)
	ctx.beginPath();
	ctx.rect(PosX, PosY, SizeX, SizeY);
	ctx.clip();

	// Draw the blocks
	let TheBlockSize = SizeX / GameColumns;
	DrawBlocks(Blocks, PosX, PosY + SizeY, TheBlockSize);
	if (CurrentPiece !== undefined)
		DrawBlocks(CurrentPiece, PosX + PiecePosX * TheBlockSize, PosY + SizeY - PiecePosY * TheBlockSize, TheBlockSize);
	
	ctx.restore();

	// Draw the separating lines
	ctx.fillStyle = "#101010";
	let Thickness = Math.round(GameScale * 0.04 / GameColumns);
	for (i = 1; i < GameRowsExtended; i++) {
		drawCenter(PosX + SizeX * 0.5, PosY + (GameRowsExtended - i) * SizeY / GameRowsExtended, SizeX, Thickness);
	}
	let JustGameSizeY =  SizeY * (GameRows / GameRowsExtended);
	for (i = 1; i < GameColumns; i++) {
		drawCenter(PosX + i * SizeX / GameColumns, PosY + SizeY * 0.5, Thickness, SizeY);
	}

	// Game board
	let HalfThickness = Math.round(Thickness * 0.5);
	drawCenter(PosX - HalfThickness, PosY + SizeY * 0.5, Thickness * 2, SizeY + Thickness * 3);
	drawCenter(PosX + SizeX + HalfThickness, PosY + SizeY * 0.5, Thickness * 2, SizeY + Thickness * 3);
	drawCenter(PosX + SizeX * 0.5, PosY - HalfThickness, SizeX + Thickness * 3, Thickness * 2);
	drawCenter(PosX + SizeX * 0.5, PosY + SizeY + HalfThickness, SizeX + Thickness * 3, Thickness * 2);

	if (GameState == STATE_ANIMATEPRE) {
		let AnimProgress = 1.0 - (StateTimeLeft / STATE_DUR_ANIMATEPRE);
		ctx.fillStyle = "rgba(200,200,200," + AnimProgress + ")";
		drawCenter(PosX + SizeX * 0.5, PosY + SizeY - TheBlockSize * (ClearAnimPos + 0.5), SizeX * AnimProgress, TheBlockSize * ClearAnimHeight);
	}
	else if (GameState == STATE_ANIMATEPOST) {
		let AnimProgress = StateTimeLeft / STATE_DUR_ANIMATEPOST;
		ctx.fillStyle = "rgba(200,200,200," + AnimProgress + ")";
		drawCenter(PosX + SizeX * 0.5, PosY + SizeY - TheBlockSize * (ClearAnimPos + 0.5), SizeX * (1.0 + 0.2 * (1.0 - Math.pow(AnimProgress, 2))), TheBlockSize * ClearAnimHeight);
	}

	// Score
	ctx.strokeStyle = "#000000";
	ctx.fillStyle = "#FFFFFF";
	drawText(HoldBox_X - CornerSpace * 0.4, PosY + CornerSpace * 1.20, CornerSpace * 0.2, "Score:", 0);
	drawText(HoldBox_X - CornerSpace * 0.4, PosY + CornerSpace * 1.40, CornerSpace * 0.2, Score.toString(), 0);
}

function DrawBlocks(B, PosX, PosY, BlockSize, AddBorder = false)
{
	let LineY = 0;
	for (py = 0; py < B.length; py++) {
		LineY = PosY - (py + 0.5) * BlockSize;
		for (px = 0; px < B[py].length; px++) {
			if (B[py][px] === -1) continue;
			ctx.fillStyle = BlockColors[B[py][px]];
			drawCenter(PosX + (px + 0.5) * BlockSize, LineY, BlockSize, BlockSize);
		}
	}
	if (AddBorder) {
		let BorderWidth = Math.round(BlockSize * 0.1);
		ctx.fillStyle = "#000000";
		for (py = 0; py < B.length; py++) {
			for (px = 0; px < B[py].length; px++) {
				if (B[py][px] === -1) continue;
				drawCenter(PosX + (px + 0) * BlockSize, PosY - (py + 0.5) * BlockSize, BorderWidth, BlockSize + BorderWidth);
				drawCenter(PosX + (px + 1) * BlockSize, PosY - (py + 0.5) * BlockSize, BorderWidth, BlockSize + BorderWidth);
				drawCenter(PosX + (px + 0.5) * BlockSize, PosY - (py + 0) * BlockSize, BlockSize + BorderWidth, BorderWidth);
				drawCenter(PosX + (px + 0.5) * BlockSize, PosY - (py + 1) * BlockSize, BlockSize + BorderWidth, BorderWidth);
			}
		}
	}
}

function drawCenter(x, y, sx, sy) {
	ctx.beginPath();
	ctx.rect(Math.floor(x - sx * 0.5), Math.floor(y - sy * 0.5), Math.floor(sx), Math.floor(sy));
	ctx.fill();
	ctx.closePath();
}

//Align:
//  0 = left
//  1 = center
//  2 = right
function drawText(x, y, size, text, Align = 1, BorderWidth = 0.1) {
	FlooredSize = Math.floor(size);
	ctx.font = FlooredSize + "px serif";
	if (Align !== 0) {
		const Measured = ctx.measureText(text);
		x -= ((Align === 1) ? 0.5 : 1.0) * Measured.width;
	}
	x = Math.floor(x);
	y = Math.floor(y);
	if (BorderWidth > 0.0) {
		ctx.lineWidth = Math.floor(FlooredSize * BorderWidth);
		ctx.strokeText(text, x, y);
	}
	ctx.fillText(text, x, y);
}

function lerp (start, end, amt) {
	return (1-amt)*start+amt*end
}

function CloneArray(A) {
	let Cloned = new Array(A.length);
	for (let i = 0; i < A.length; i++)
	{
		if (Array.isArray(A[i]))
			Cloned[i] = CloneArray(A[i]);
		else
			Cloned[i] = A[i];
	}
	return Cloned;
}
