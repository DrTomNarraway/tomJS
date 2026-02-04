
export const Stimulus = ((module)=>{

	class Stimulus {

		constructor() {
			this.data = {};
		}

		draw() {
			// does nothing
		}

		initialize(data) {
			// does nothing
		}

		reset() {
			// does nothing
		}

		set(key, value, reset = true) {
			this.data[key] = value;
			if (reset) this.reset();
		}

	};

	class Gabor extends Stimulus {

		constructor(args = {}) {
			super(args);
			if (!('target' in args))     tomJS.error('no target passed to gabor');
			if (!('difficulty' in args)) tomJS.error('no difficulty passed to gabor');
			this.data.target     = args.target;
			this.data.difficulty = args.difficulty;
			this.data.gp_opacity  = args.gp_opacity  ?? 1.0;  // as percentage
			this.data.gp_ori      = args.gp_ori      ?? 25;	// in degrees
			this.data.gp_x        = args.gp_x        ?? 0.5;	// in screen units
			this.data.gp_y        = args.gp_y        ?? 0.5;	// in screen units
			this.data.gp_sf       = args.gp_sf       ?? 15;
			this.data.gp_size     = args.gp_size     ?? 1.0;	// in stimulus units
			this.data.gp_px = Math.round(tomJS.visual.stimulus_size * this.data.gp_size);
			this.prepareImageData();
		}

		// super

		draw() {
			super.draw();
			const _s = this.data.gp_px;
			const img = tomJS.visual.context.createImageData(_s, _s);
			assignImageData(this.image_data, img.data);
			let pos_x = tomJS.visual.screen_size * this.data.gp_x - (_s * 0.5);
			let pos_y = tomJS.visual.screen_size * this.data.gp_y - (_s * 0.5);
			tomJS.visual.context.putImageData(img, pos_x, pos_y);
		}

		// functions

		prepareImageData() {
			const s   = this.data.gp_px;
			const con = this.data.difficulty;
			const ori = this.data.gp_ori;
			const sf  = this.data.gp_sf;
			const lum = 127.5;
			const phs = 0;
			const sigma = 0.2 * s;
			const cx = s / 2, cy = s / 2;
			const dir = (this.data.target == 'A') ? -1 : 1;
			const theta = (ori * Math.PI * dir) / 180;
			const cosT = Math.cos(theta), sinT = Math.sin(theta);
			const k = 2 * Math.PI * sf / s;
			const amp = lum * clamp(con, 0, 1);
			let image_data = [];
			for (let _y = 0; _y < s; _y++) {
				const dy = _y - cy
				for (let _x = 0; _x < s; _x++) {
					const dx = _x - cx;
					const xPrime = dx * cosT + dy * sinT;
					const yPrime = -dx * sinT + dy * cosT;
					const gauss = Math.exp(-(xPrime * xPrime + yPrime * yPrime) / (2 * sigma * sigma));
					const carrier = Math.cos(k * xPrime + phs);
					const L = lum + amp * carrier;
					const v = clamp(L, 0, 255) | 0;
					image_data.push(v);							// R
					image_data.push(v);							// G
					image_data.push(v);							// B
					image_data.push(Math.round(255 * gauss));	// A
				}
			}
			this.image_data = new Uint8ClampedArray(image_data);
		}

	};

	class TwoLines extends Stimulus {

		constructor(args = {}) {
			super(args);
			if (!('target' in args))     tomJS.error('no target passed to two lines');
			if (!('difficulty' in args)) tomJS.error('no difficulty passed to two lines');
			this.data.target     = args.target;
			this.data.difficulty = args.difficulty;
			this.data.tl_color_L    = args.tl_color_L    ?? "white";
			this.data.tl_color_R    = args.tl_color_R    ?? "white";
			this.data.tl_distance   = args.tl_distance   ?? 0.25;		// percent of canvas
			this.data.tl_height     = args.tl_height     ?? 0.15;		// percent of canvas
			this.data.tl_width      = args.tl_width      ?? 0.02;		// percent of canvas
			this.data.tl_x          = args.tl_x          ?? 0.5;		// percent of canvas
			this.data.tl_y          = args.tl_y          ?? 0.5;		// percent of canvas
			this.data.tl_keep_fix   = args.tl_keep_fix   ?? true;
		}

		// super

		draw() {
			super.draw();
			if (this.data.tl_keep_fix) tomJS.writeToCanvas('+');
			this.drawOneLine('A');
			this.drawOneLine('B');
		}

		// functions

		drawOneLine(side){
			const w = (tomJS.stimulus_size * this.data.tl_width);
			const adjust = (side === this.data.target) ? this.dapropertiesta.tl_difference : 0;
			const h = (tomJS.stimulus_size * this.data.tl_height) + adjust;
			const pos_y = (tomJS.stimulus_size * this.data.tl_y);
			const offset_y = h * 0.5;
			const y = pos_y - offset_y;
			const pos_x = tomJS.stimulus_size * this.data.tl_x;
			const distance = tomJS.stimulus_size * this.data.tl_distance;
			const offset_x = w * 0.5;
			const x = (side === "A") ? pos_x - offset_x - distance : pos_x - offset_x + distance;
			const c = (side === this.data.target) ? this.data.tl_color_L : this.data.tl_color_R ;
			tomJS.fillRect(x, y, w, h, c);
		}

	};

	class PixelPatch extends Stimulus {

		constructor(args = {}) {
			if (!('difficulty' in args)) tomJS.error('no way to generate pixel patch stimulus');
			super(args);
			this.data.difficulty = args.difficulty;
			this.data.target     = (this.data.difficulty > 0.5) ? 'A' : 'B';
			this.data.pp_color_A  = args.pp_color_A ?? colours.black;
			this.data.pp_color_B  = args.pp_color_B ?? colours.white;
			this.data.pp_cells    = args.pp_cells   ?? 64;	// cells per row / column
			this.data.pp_size     = args.pp_size    ?? 1;	    // pixels per cell
			this.data.pp_x        = args.pp_x       ?? 0.5;	// in screen units
			this.data.pp_y        = args.pp_y       ?? 0.5;	// in screen units
			this.calculateImageSize();
			this.prepareImageData();
		}

		// super	

		draw() {
			const _g = this.data.grid_pixels;
			super.draw();
			const _img = tomJS.visual.context.createImageData(_g, _g);
			assignImageData(this.image_data, _img.data);
			let _pos_x = tomJS.visual.screen_size * this.data.pp_x - Math.round(_g * 0.5);
			let _pos_y = tomJS.visual.screen_size * this.data.pp_y - Math.round(_g * 0.5);
			tomJS.visual.context.putImageData(_img, _pos_x, _pos_y);
		}

		// functions
	
		calculateCellDistribution() {
			const _d = this.data.difficulty;
			const _c = this.data.pp_cells;
			const _a = Math.ceil(_c * _d);
			const _b = _c - _a;
			this.data.a_cells = _a;
			this.data.b_cells = _b;
		}

		calculateImageSize() {
			const _c = this.data.pp_cells;
			const _s = this.data.pp_size;
			const _g = _c * _s;
			this.data.grid_pixels = _g;
		}

		prepareImageData() {
			this.calculateCellDistribution();
			const _A = this.data.pp_color_A;
			const _B = this.data.pp_color_B;
			const _c = this.data.pp_cells;
			const _s = this.data.pp_size;
			const _a = this.data.a_cells;
			const _b = this.data.b_cells;
			let _i = [];
			for (let x = 0; x < _c; x++) {
				const _row = Array(_a).fill(_A).concat(Array(_b).fill(_B)); // create a row of pixels
				const _shf = returnShuffledArray(_row); // randomly shuffle the order of the pixels			
				const _ext = _shf.flatMap(z => Array(_s).fill(z)); // extend the row horizontally
				for (let y = 0; y < _s; y++) _i = _i.concat(_ext.flat()); // repeat the row vertically
			};
			this.image_data = new Uint8ClampedArray(_i);
		}

	};

	class ProgressBar extends Stimulus {

		constructor(args = {}) {
			super(args);
			this.data.bar_colour      = args.progressbar_bar_colour	    ?? "White";
			this.data.border_colour   = args.progressbar_border_colour  ?? "Grey";
			this.data.height          = args.progressbar_height		    ?? 0.13;
			this.data.width           = args.progressbar_width		    ?? 0.75;
			this.data.x               = args.progressbar_x			    ?? 0.50;
			this.data.y               = args.progressbar_y			    ?? 0.20;
			this.data.percent         = args.progressbar_percent		?? 0;
			this.data.scale           = args.progressbar_scale		    ?? 1;
			if (this.data.scale != 1) 
				this.data.height *= this.data.scale
				this.data.width *= this.data.scale;
		}

		// super

		draw() {
			super.draw();
			this.drawBorder();
			this.drawBar();
		}

		// functions

		drawBorder() {
			const w = tomJS.visual.stimulus_size * this.data.width;
			const h = tomJS.visual.stimulus_size * this.data.height;
			const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.border_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.data.width * this.data.percent;
			const h = tomJS.visual.stimulus_size * this.data.height * this.data.bar_height;
			const x = (tomJS.visual.screen_size * this.data.x) - (tomJS.visual.stimulus_size * this.data.width * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

	};

	class LeakyBar extends ProgressBar {

		constructor(args={}) {
			super(args);
		}

		// override

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.data.width * (1 - this.data.percent);
			const h = tomJS.visual.stimulus_size * this.data.height * this.data.bar_height;
			const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

	};

	class LeakyWindow extends LeakyBar {

		constructor(args={}) {
			super(args);
			this.data.window_colour    = args.window_colour ?? "Silver";
			this.data.window_width     = args.window_width  ?? 0.20;
			this.data.window_linewidth = args.linewidth     ?? 2;
		}

		// super

		draw() {
			super.draw();
			this.drawWindow();
		}

		initialize(data) {
			super.initialize(data);
			this.data.window_width = data.signal_for / data.trial_duration;
		}

		// functions

		drawWindow() {
			const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
			const h = tomJS.visual.stimulus_size * this.data.height;
			const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.window_colour;
			const l = this.data.window_linewidth;
			tomJS.strokeRect(x, y, w, h, c, l);
		}

	};

	class GuitarHeroBar extends ProgressBar {

		constructor(args={}) {
			super(args);
			this.data.bar_width        = args.bar_width     ?? 0.01;
			this.data.bar_height       = args.bar_height    ?? 0.17;
			this.data.window_colour    = args.window_colour ?? "LightGrey";
			this.data.window_width     = args.window_width  ?? 0.20;
			this.data.window_pos       = args.window_pos    ?? 0.80;
			this.data.window_linewidth = args.linewidth     ?? 2;
		}

		// super

		draw() {
			super.draw();
			this.drawWindow();
		}

		initialize(data) {
			super.initialize(data);
			this.data.window_width = data.signal_for / data.trial_duration;
			this.data.window_pos = 1 - this.data.window_width;
		}

		// override

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.data.bar_width;
			const h = tomJS.visual.stimulus_size * this.data.bar_height;
			const p = clamp(this.data.percent, 0, 1);
			const x = (tomJS.visual.screen_size * this.data.x) + 
				(tomJS.visual.stimulus_size * this.data.width * p) - 
				(tomJS.visual.stimulus_size * this.data.width * 0.5) - 
				(w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		// functions

		drawWindow() {
			const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
			const h = tomJS.visual.stimulus_size * this.data.height;
			const o = this.data.window_pos;
			const bar_x = tomJS.visual.screen_size * this.data.x;
			const bar_w = tomJS.visual.stimulus_size * this.data.width;
			const x = bar_x + (bar_w * o) - (bar_w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.window_colour;
			const l = this.data.window_linewidth;
			tomJS.strokeRect(x, y, w, h, c, l);
		}

	};

	class NecroDancerBar extends ProgressBar {

		constructor(args={}) {
			super(args);
			this.data.bar_width        = args.bar_width     ?? 0.01;
			this.data.bar_height       = args.bar_height    ?? 0.17;
			this.data.window_colour    = args.window_colour ?? "LightGrey";
			this.data.window_width     = args.window_width  ?? 0.20;
			this.data.window_pos       = args.window_pos    ?? 0.50;
			this.data.window_linewidth = args.linewidth     ?? 2;
			if (this.data.scale != 1) 
				this.data.bar_height *= this.data.scale
				this.data.bar_width *= this.data.scale;
		}

		// super

		draw() {
			super.draw();
			this.drawRightBar();
			this.drawWindow();
		}

		initialize(data) {
			super.initialize(data);
			this.data.window_width = data.signal_for / data.trial_duration;
		}

		// override

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.data.bar_width;
			const h = tomJS.visual.stimulus_size * this.data.bar_height;
			const p = clamp(this.data.percent, 0, 1) * 0.5;
			const x = (tomJS.visual.screen_size * this.data.x) + 
				(tomJS.visual.stimulus_size * this.data.width * p) - 
				(tomJS.visual.stimulus_size * this.data.width * 0.5) - 
				(w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		// functions

		drawRightBar() {
			const w = tomJS.visual.stimulus_size * this.data.bar_width;
			const h = tomJS.visual.stimulus_size * this.data.bar_height;
			const p = 1 - clamp(this.data.percent, 0, 1) * 0.5;
			const x = (tomJS.visual.screen_size * this.data.x) + 
				(tomJS.visual.stimulus_size * this.data.width * p) - 
				(tomJS.visual.stimulus_size * this.data.width * 0.5) - 
				(w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		drawWindow() {
			const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
			const h = tomJS.visual.stimulus_size * this.data.height;
			const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.window_colour;
			const l = this.data.window_linewidth;
			tomJS.strokeRect(x, y, w, h, c, l);
		}

	};

	class Table extends Stimulus {

		example_content = ['','A','B','C','AC','BC','D','AD','BD'];
		example_borders = [4, 5, 7, 8];

		constructor(args={}) {
			super(args);
			this.data.tbl_cols      = args.tbl_cols      ?? 3;
			this.data.tbl_cell_w    = args.tbl_cell_w    ?? 0.30;	// width of cells in stimulus units
			this.data.tbl_cell_h    = args.tbl_cell_h    ?? 0.15;	// height of cells in stimulus units
			this.data.tbl_x         = args.tbl_x         ?? 0.5;
			this.data.tbl_y         = args.tbl_y         ?? 0.5;
			this.data.tbl_content   = args.tbl_content   ?? this.example_content;
			this.data.tbl_borders   = args.tbl_borders   ?? this.example_borders;
			this.data.tbl_colour    = args.tbl_colour    ?? "white";
			this.data.tbl_lineWidth = args.tbl_lineWidth ?? 1; // width of border in pixels units
			this.data.tbl_cells     = this.data.tbl_content.length;
			this.data.tbl_rows      = this.data.tbl_cells / this.data.tbl_cols;
			this.matrix = this.generateMatrix();
		}

		// super

		draw() {
			super.draw();
			this.drawAllCells();
			this.writeAllCells();
		}

		// functions

		drawAllCells() {
			// iterate over provided list of cells and draw a box around it
			for (let c of this.data.tbl_borders) this.drawOneCell(c);
		}

		drawOneCell(index) {
			const col = index % this.data.tbl_cols;
			const row = Math.floor(index / this.data.tbl_rows);		
			const scrn = tomJS.visual.screen_size;
			const stim = tomJS.visual.stimulus_size;
			const w = stim * this.data.tbl_cell_w;
			const h = stim * this.data.tbl_cell_h;
			const x = (scrn * this.data.tbl_x * (1 - this.data.tbl_cell_w)) + 
				(scrn * this.data.tbl_cell_w * col * 0.5) - 
				(w * 0.5);
			const y = (scrn * this.data.tbl_y * (1 - this.data.tbl_cell_h)) +
				(scrn * this.data.tbl_cell_h * row * 0.5) -
				(h * 0.5);
			const c = this.data.tbl_colour;
			const l = this.data.tbl_lineWidth;		
			tomJS.drawBox(x, y, w, h, c, l);
		}

		generateMatrix() {
			const cols = this.data.tbl_cols;
			const rows = this.data.tbl_rows;
			let out = [];
			for (let r = 0; r < rows; r++) {
				const b = r * cols;
				const e = b + this.data.tbl_cols;
				out.push(this.data.tbl_content.slice(b, e));
			};
			return out;
		}

		writeAllCells() {
			// iterate over the content array and write each cell to the screen
			for (let c = 0; c < this.data.tbl_cells; c++) this.writeOneCell(c);
		}

		writeOneCell(index) {
			const col = index % this.data.tbl_cols;
			const row = Math.floor(index / this.data.tbl_rows);
			const content = this.data.tbl_content[index];
			const x = (this.data.tbl_x * (1 - this.data.tbl_cell_w)) + (this.data.tbl_cell_w * col * 0.5);
			const y = (this.data.tbl_y * (1 - this.data.tbl_cell_h)) + (this.data.tbl_cell_h * row * 0.5);
			const args = {'x':x, 'y':y};
			tomJS.writeToCanvas(content, args);
		}

	};

	class Text extends Stimulus {

		constructor(args={}) {
			super(args);
			this.data.target     = args.target;
			this.data.difficulty = '';
			this.data.text       = args.text;
			this.data.x          = args.text_x      ?? 0.5;
			this.data.y          = args.text_y      ?? 0.5;
			this.data.colour     = args.text_colour ?? "white";
			this.data.upper      = args.text_upper  ?? false;
			this.data.size       = args.size        ?? 0.25;
			this.data.fontSize   = this.calculateFontSize(this.data.size);
		}

		// super

		draw() {
			super.draw();
			tomJS.writeToCanvas(this.data.text, this.data);
		}

		// functions

		calculateFontSize(size) {
			return Math.round(size * tomJS.visual.stimulus_size) + "px";
		}

	};

    module.Stimulus = Stimulus;
    module.Gabor = Gabor;
    module.TwoLines = TwoLines;
    module.PixelPatch = PixelPatch;
    module.ProgressBar = ProgressBar;
    module.LeakyBar = LeakyBar;
    module.LeakyWindow = LeakyWindow;
    module.GuitarHeroBar = GuitarHeroBar;
    module.NecroDancerBar = NecroDancerBar;
    module.Table = Table;
    module.Text = Text;

    return module;

})({});
