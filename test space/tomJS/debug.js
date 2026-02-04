
export const Debug = ((module)=>{

    class Debug {

        constructor(args={}) {
            this.gridlines  = args.gridlines  ?? false;
		    this.fullscreen = args.fullscreen ?? true;
		    this.save       = args.save       ?? true;
        }

    };

    module.Debug = Debug;

    return module;

})({});
