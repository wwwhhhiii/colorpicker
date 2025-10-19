export namespace main {
	
	export class Color {
	    rgb: number[];
	    alpha: number;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new Color(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rgb = source["rgb"];
	        this.alpha = source["alpha"];
	        this.description = source["description"];
	    }
	}
	export class ColorGroup {
	    name: string;
	    colorspace: number;
	    colors: Color[];
	
	    static createFrom(source: any = {}) {
	        return new ColorGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.colorspace = source["colorspace"];
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

}

