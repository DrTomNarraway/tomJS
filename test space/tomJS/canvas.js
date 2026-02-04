
export const Canvas = ((module) => {

	class Canvas {

		constructor(args={}) {
			this.args = args;
		}

		createCanvas(args={}) {
			this.canvas = document.createElement('canvas');		
			this.canvas.id = "canvas";
			this.canvas.width = args.width ?? window.innerWidth - 16;
			this.canvas.height = args.height ?? window.innerHeight - 16;
			this.canvas.style.position = args.position ?? "absolute";
			this.canvas.style.backgroundColor = args.backgroundColor ?? "black";
			this.canvas.style.color = args.colour ?? "white";
			this.canvas.style.cursor = args.cursor ?? "none";
			document.body.appendChild(this.canvas);
			this.context = this.canvas.getContext("2d");
		}

	};
	
	module.Canvas = Canvas;

	return module;

})({});
