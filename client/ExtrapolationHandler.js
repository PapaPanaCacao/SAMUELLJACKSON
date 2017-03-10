function ExtrapolationHandler()
{
	this.expectedSeq = 0;
	this.countTick = 0;//problem is tick may not get incremented if interval is cleared
	this.messages = [];//parsed messages
	this.extrapolate = () => { this.countTick = this.countTick + 1; ControllerTick();}	
	this.checkRollback = genCheckRollback(this);
	
	this.interval;
	this.set = ()=> {this.interval = setTimeout(this.extrapolate, 750);}
	this.clear = () => {clearTimeout(this.interval);}
};

function genCheckRollback(EH) //method test this baby
{
	function handleRollback(newDir)
	{
		var snakeIndex = getModel().snakeIndex == 0 ? 1 : 0;
		var otherSnake = getModel().getSnake(snakeIndex);
		if(!otherSnake.getDirection().equals(newDir))
		{
			otherSnake.headPos = otherSnake.headPos - (countTick - expectedSeq);
			//change direction
			getModel().changeDirection(snakeIndex, newDir);
			for(var i = 0; i < (Tick - expectedSeq); ++i)
			{
				otherSnake.growSnake();
			}
		}
	}
	
	function nest(newDir)
	{
		var p;
		EH.messages = EH.messages.sort((a,b)=>{return parseInt(a[2]) < parseInt(b[2]);});
		while(EH.messages.length > 0 && (p = EH.messages[0][2]) == expectedSeq)
		{
			EH.messages = EH.messages.slice(1);
			EH.expectedSeq = EH.expectedSeq + 1;
			handleRollback(newDir);
		}
	}
	
	return nest;
}