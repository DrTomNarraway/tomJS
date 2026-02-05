
const Canvas = ((module) => {

	class Canvas {

		constructor(args={}) {
			this.args = args;
			this.data = {};
			this.canvas = document.createElement('canvas');
			this.canvas.id = args.id ?? "canvas";
			this.data.id = this.canvas.id;
			this.data.width = args.width ?? window.innerWidth - 16;
			this.data.height = args.height ?? window.innerHeight - 16;
			this.data.position = args.position ?? "absolute";
			this.data.backgroundColor = args.backgroundColor ?? "black";
			this.data.color = args.colour ?? "white";
			this.data.cursor = args.cursor ?? "none";
			document.body.appendChild(this.canvas);
			this.context = this.canvas.getContext("2d");
			this.update();
		}

		update(args={})  {
			this.canvas.width = args.width ?? this.data.width;
			this.canvas.height = args.height ?? this.data.height;
			this.canvas.style.position = args.position ?? this.data.position;
			this.canvas.style.backgroundColor = args.backgroundColor ?? this.data.backgroundColor;
			this.canvas.style.color = args.colour ?? this.data.color;
			this.canvas.style.cursor = args.cursor ?? this.data.cursor;
		}

	};
	
	module.Canvas = Canvas;

	return module;

})({});
