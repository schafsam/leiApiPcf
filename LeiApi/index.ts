import {IInputs, IOutputs} from "./generated/ManifestTypes";
import * as $ from "jquery";

interface Dic {
    [key: string]: Provider
}

interface Provider {
    name: string,
    highlighting: string,
    lei: string,
    addressLine?: string,
    city?: string,
    postalCode?: string,
    countryCode?: string,
    registeredAs?: string,
    link: string
}

export class LeiApi implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private _context: ComponentFramework.Context<IInputs>;

    public _notifyOutputChanged: () => void;

    public inputElement: HTMLInputElement;
    private listElement: HTMLDivElement;
    private _container: HTMLDivElement;
    private _name: string;
    private _country: string;
    private _value: string;
    private _account_name: string;
    private _address_line: string;
    private _city: string;
    private _postcode: string;    
    private _countrycode: string;
    private _lei_code: string;
    private _registered_as: string;
    private _currentSelectedItem :number;
    private elementHover : boolean; 
    private datas : Dic;

    /**
     * Empty constructor.
     */
    constructor()
    {

    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
     */
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement): void
    {
        this._context = context;
        this._notifyOutputChanged = notifyOutputChanged;
        this._currentSelectedItem = -1;
        this.elementHover = false;
        this.datas = {};
		
		if (this._context.parameters.account_name.raw) 
			this._account_name = this._context.parameters.account_name.raw as string;
        
        if(this._context.parameters.account_name.attributes?.LogicalName)
            this._name = this._context.parameters.account_name.attributes?.LogicalName;
        else
            this._name = "";
            
        this._value = this._account_name;


        this._country = this._context.parameters.country_code.raw ? this._context.parameters.country_code.raw : "FRANCE";

        this.listElement = document.createElement("div");
        this.listElement.setAttribute("id", this._name +"_accountList" );
        this.listElement.setAttribute("class", "autocomplete-items");

        this.inputElement = document.createElement("input");
        this.inputElement.setAttribute("id", this._name +"_search_field");
        this.inputElement.setAttribute("type", "text");
        this.inputElement.setAttribute("class", "InputAddress");
        //this.inputElement.setAttribute("value", "");
        if(this._account_name != "" && this._account_name != undefined)
            this.inputElement.value = this._account_name;
        else
            this._account_name = "---" ;
        this.inputElement.addEventListener("keyup", this.onKeyUp.bind(this));

        this.inputElement.addEventListener("focusin", () => {
            this.inputElement.className = "InputAddressFocused";
            if (this.inputElement.value == "---") this.inputElement.value = "";
        });
        this.inputElement.addEventListener("focusout", () => {
            this.inputElement.className = "InputAddress";
            if (this.inputElement.value == "") this.inputElement.value = "---";
        });

        container.addEventListener("focusout", () => {
            if(!this.elementHover){
                this.listElement.hidden = true;
                this._account_name = this.inputElement.value;
                if(this._account_name != "")
                    this._notifyOutputChanged();
            }
        });
        
        container.appendChild(this.inputElement);
        container.appendChild(this.listElement);

        document.addEventListener('keydown', (event) => {
            if(event.key == 'Escape' || (event.key == 'Enter' && this._currentSelectedItem == -1) )
            {
                this.listElement.hidden = true;
                this._account_name = this.inputElement.value;

                if(this._account_name != "")
                    this._notifyOutputChanged();
            }
				
		});
        
        $(document).bind('IssuesReceived', this.selectValue.bind(this));
    }

    private onKeyUp(event: KeyboardEvent): void {

        
		if (event.key == 'ArrowDown' || event.key == 'ArrowUp')
		{
			event.key == 'ArrowDown' ? this.navigateOptions(true) : this.navigateOptions(false);
			return;
		}

		if (event.key == 'Enter' && this._currentSelectedItem != -1){
			this.selectOption(this._currentSelectedItem);
			return;
		}
			
        if (event.key == 'Escape')
        {
            this._account_name = this.inputElement.value;
            if(this._account_name != "")
                this._notifyOutputChanged();
            return;
        }

        this._value = this.inputElement.value;

        if (this._value.length < 3){
            return;
        }
        
        var url = 'https://api.gleif.org/api/v1/autocompletions?field=fulltext&q=' + encodeURIComponent(this._value);
        var key: any;
        var self = this;
        $.getJSON(
            url
        ).done(function (info) {

            if (info && info.data) {
                
                (<HTMLDivElement>document.getElementById(self._name +"_accountList" )).innerHTML = "";
                (<HTMLDivElement>document.getElementById(self._name +"_accountList" )).hidden = false;

                for (const element of info.data) {
                    if (!("relationships" in element)){
                        continue;
                    }
                    let item: Provider = {
                        name : element.attributes.value,
                        highlighting: element.attributes.highlighting,
                        lei: element.relationships["lei-records"].data.id,
                        link: element.relationships["lei-records"].links.related,
                    }
                    self.datas[item.lei] = item;
                    const url_ = element.relationships["lei-records"].links.related;
                    $.getJSON(url_).done(function (info) {
                        item.city = info.data.attributes.entity.legalAddress.city;
                        item.countryCode = info.data.attributes.entity.legalAddress.country;
                        item.addressLine = info.data.attributes.entity.legalAddress.addressLines[0];
                        item.postalCode = info.data.attributes.entity.legalAddress.postalCode;
                        item.registeredAs = info.data.attributes.entity.registeredAs;
                        let div_ = document.getElementById(item.lei);
                        if (div_) {
                            div_.textContent = (item.city || "") + ", " + (item.countryCode || "");
                        }
                    })
                    let newDiv: HTMLDivElement;
                    newDiv = document.createElement("div");
                    newDiv.innerHTML = item.highlighting;
                    newDiv.addEventListener("click", function () {
                        /*insert the value for the autocomplete text field:*/
                        (<HTMLInputElement>document.getElementById(self._name +"_search_field")).value = this.getElementsByTagName("input")[0].value;                       
                        (<HTMLDivElement>document.getElementById(self._name +"_accountList" )).innerHTML = this.getElementsByTagName("input")[0].id;
                        (<HTMLDivElement>document.getElementById(self._name +"_accountList" )).hidden = true;
                        $(document).trigger('IssuesReceived');
                    });
                    newDiv.addEventListener("mouseover", function () {self.elementHover = true;})
                    newDiv.addEventListener("mouseout", function () {self.elementHover = false;})
                    let newDivText: HTMLDivElement;
                    newDivText = document.createElement("div");
                    newDivText.setAttribute("id", item.lei);
                    newDivText.textContent = (item.city || "") + ", " + (item.countryCode || "");
                    newDiv.appendChild(newDivText);
                    let newOptionTest: HTMLInputElement;
                    newOptionTest = document.createElement("input");
                    newOptionTest.setAttribute("type", "hidden");
                    newOptionTest.setAttribute("value", item.name);
                    newOptionTest.setAttribute("id", item.lei);
                    newDiv.appendChild(newOptionTest);
                    (<HTMLDivElement>document.getElementById(self._name +"_accountList" )).appendChild(newDiv);
                }
            }
        });
    }


    public selectValue(): void {
        let data = (<HTMLDataListElement>document.getElementById(this._name +"_accountList" )).innerHTML;
        if (!data.startsWith("<div") && data != "") {
            const selectedItem = this.datas[data];
            this.inputElement.value = selectedItem.name;
            this._account_name = (selectedItem.name|| "");
            this._address_line = (selectedItem.addressLine || "");
            this._postcode = (selectedItem.postalCode || "");
            this._city = (selectedItem.city || "");
            this._countrycode = (selectedItem.countryCode|| "");
            this._registered_as= (selectedItem.registeredAs || "");
            this._lei_code = data;
            this._value = this._account_name;
            this._notifyOutputChanged();
        }        
    }


    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void
    {
        this._context = context;
        if(this._value != "" && this._value != undefined)
            this.inputElement.value = this._value;
        else
            this.inputElement.value = "---" ;
            
        this._container.appendChild(this.inputElement);
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
     */
    public getOutputs(): IOutputs
    {
        return {
            account_name: this._account_name,
            address_line_1: this._address_line,
            city: this._city,
            postcode: this._postcode,
            country_code: this._countrycode,
            registered_as: this._registered_as,
            lei_code: this._lei_code
        }
    }

    private navigateOptions(down : boolean)
	{
		if(this.listElement.hidden == true)
			return;

		var options = this.listElement.childNodes;
		if(down){
			if(this._currentSelectedItem == -1){
				(<HTMLInputElement>options[0]).style.backgroundColor =  "#e9e9e9" ;
				this._currentSelectedItem= 0;
			}
			else if(this._currentSelectedItem != options.length-1)
			{
				(<HTMLInputElement>options[this._currentSelectedItem]).style.backgroundColor = "#fff" ;
				(<HTMLInputElement>options[this._currentSelectedItem+1]).style.backgroundColor = "#e9e9e9" ;
                this._currentSelectedItem++;
			}
		}else{
			if(this._currentSelectedItem == -1){
				(<HTMLInputElement>options[options.length-1]).style.backgroundColor =  "#e9e9e9" ;
				this._currentSelectedItem= options.length-1;
			}
			else if(this._currentSelectedItem != 0){
				(<HTMLInputElement>options[this._currentSelectedItem]).style.backgroundColor =  "#fff" ;
				(<HTMLInputElement>options[this._currentSelectedItem-1]).style.backgroundColor =  "#e9e9e9" ;
				this._currentSelectedItem--;
			}
		}
    }


	private selectOption(index : number) : void{
		if(this.listElement.hidden == true)
		return;

		var options = this.listElement.childNodes;

		if(index >= 0 && index < options.length)
		{
			var tempValue = (<HTMLInputElement>(<HTMLInputElement>options[index]).childNodes[1]).value;
			var tempID =(<HTMLInputElement>(<HTMLInputElement>options[index]).childNodes[1]).id;
			this.inputElement.value = tempValue;
			this.listElement.innerHTML = tempID;
			this.listElement.hidden = true;
			this._currentSelectedItem == -1
			this.selectValue();
		}

    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void
    {
        // Add code to cleanup control if necessary
    }
}
