import{R as f}from"./rom.js";class r extends f{constructor(){super(...arguments),this.CHIP_NAME="ESP8266",this.CHIP_DETECT_MAGIC_VALUE=[4293968129],this.EFUSE_RD_REG_BASE=1072693328,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.XTAL_CLK_DIVIDER=2,this.FLASH_WRITE_SIZE=16384,this.BOOTLOADER_FLASH_OFFSET=0,this.UART_DATE_REG_ADDR=0,this.FLASH_SIZES={"512KB":0,"256KB":16,"1MB":32,"2MB":48,"4MB":64,"2MB-c1":80,"4MB-c1":96,"8MB":128,"16MB":144},this.SPI_REG_BASE=1610613248,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_MOSI_DLEN_OFFS=0,this.SPI_MISO_DLEN_OFFS=0,this.SPI_W0_OFFS=64,this.getChipFeatures=async t=>{const s=["WiFi"];return await this.getChipDescription(t)=="ESP8285"&&s.push("Embedded Flash"),s}}async readEfuse(t,s){const i=this.EFUSE_RD_REG_BASE+4*s;return t.debug("Read efuse "+i),await t.readReg(i)}async getChipDescription(t){const s=await this.readEfuse(t,2);return(await this.readEfuse(t,0)&16|s&65536)!=0?"ESP8285":"ESP8266EX"}async getCrystalFreq(t){const s=await t.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=t.transport.baudrate*s/1e6/this.XTAL_CLK_DIVIDER;let _;return i>33?_=40:_=26,Math.abs(_-i)>1&&t.info("WARNING: Detected crystal freq "+i+"MHz is quite different to normalized freq "+_+"MHz. Unsupported crystal in use?"),_}_d2h(t){const s=(+t).toString(16);return s.length===1?"0"+s:s}async readMac(t){let s=await this.readEfuse(t,0);s=s>>>0;let i=await this.readEfuse(t,1);i=i>>>0;let _=await this.readEfuse(t,3);_=_>>>0;const e=new Uint8Array(6);return _!=0?(e[0]=_>>16&255,e[1]=_>>8&255,e[2]=_&255):i>>16&255?(i>>16&255)==1?(e[0]=172,e[1]=208,e[2]=116):t.error("Unknown OUI"):(e[0]=24,e[1]=254,e[2]=52),e[3]=i>>8&255,e[4]=i&255,e[5]=s>>24&255,this._d2h(e[0])+":"+this._d2h(e[1])+":"+this._d2h(e[2])+":"+this._d2h(e[3])+":"+this._d2h(e[4])+":"+this._d2h(e[5])}getEraseSize(t,s){return s}}export{r as ESP8266ROM};
