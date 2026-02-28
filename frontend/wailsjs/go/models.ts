export namespace main {
	
	export class ColorVariant {
	    rgb: number[];
	    alpha: number;
	    description: string;
	    img: string;
	
	    static createFrom(source: any = {}) {
	        return new ColorVariant(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rgb = source["rgb"];
	        this.alpha = source["alpha"];
	        this.description = source["description"];
	        this.img = source["img"];
	    }
	}
	export class Color {
	    name: string;
	    displayName: string;
	    colorspace: number;
	    variants: ColorVariant[];
	
	    static createFrom(source: any = {}) {
	        return new Color(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.displayName = source["displayName"];
	        this.colorspace = source["colorspace"];
	        this.variants = this.convertValues(source["variants"], ColorVariant);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ColorGroup {
	    name: string;
	    colors: Color[];
	
	    static createFrom(source: any = {}) {
	        return new ColorGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.colors = this.convertValues(source["colors"], Color);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ColorsFileLoadResult {
	    colorGroups: ColorGroup[];
	    file: string;
	
	    static createFrom(source: any = {}) {
	        return new ColorsFileLoadResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.colorGroups = this.convertValues(source["colorGroups"], ColorGroup);
	        this.file = source["file"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SaveColorsDialogResult {
	    savedFile: string;
	    error: any;
	
	    static createFrom(source: any = {}) {
	        return new SaveColorsDialogResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.savedFile = source["savedFile"];
	        this.error = source["error"];
	    }
	}

}

