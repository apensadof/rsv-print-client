
// Obtener la clave de impresora desde localStorage

$rsv_ps_wrapper = $(".print-server-wrapper");
$rsv_ps_wrapper.html(`
        
        <div class="d-flex flex-column align-items-center flex-fill justify-content-center h-100">
            
            <div class="collapse setup-client">
                <span class="lead d-flex align-items-end fs-3" style="line-height: 1em;"><img src="https://cdn.rsvapp.com/img/logo/rsv_dark.png?v=1.0" style="height: 1.5rem; margin-right: 0.25rem;">Client | Print Server</span>
                <div class="form-group my-4">
                    <form id="sync-print-station">
                        <label for="sync_token" class="d-block text-center mb-4">Código de sincronización:</label>
                        <input type="text" class="form-control ps_token-digit" id="sync_token_1">
                        <input type="text" class="form-control ps_token-digit" id="sync_token_2">
                        <input type="text" class="form-control ps_token-digit" id="sync_token_3">
                        <input type="text" class="form-control ps_token-digit" id="sync_token_4">
                        <input type="text" class="form-control ps_token-digit" id="sync_token_5">
                        <input type="text" class="form-control ps_token-digit" id="sync_token_6">
                    </form>
                </div>
            </div>
            <div class="collapse connected-client">
                <div class="ps_success-checkmark">
                    <div class="check-icon">
                        <span class="icon-line line-tip"></span>
                        <span class="icon-line line-long"></span>
                        <div class="icon-circle"></div>
                        <div class="icon-fix"></div>
                    </div>
                </div>
                <span class="lead d-flex align-items-end fs-3" style="line-height: 1em;"><img src="https://cdn.rsvapp.com/img/logo/rsv_dark.png?v=1.0" style="height: 1.5rem; margin-right: 0.25rem;">Client | Print Server</span>
                <div class="station-info text-center mt-4 bg-body-tertiary p-2 text-body-tertiary"></div>
                <div class="d-flex flex-column align-items-center justify-content-center">
                    <div class="col-12">
                        <a href="#" class="btn btn-outline-primary print-test mt-4 btn-sm mx-2">Impresión de prueba</a>
                        <a href="#" class="btn btn-outline-secondary disconnect-station mt-4 btn-sm mx-2">Desconectar</a>
                    </div>
                    <div class="col-12 m-2 text-center small">
                        <a href="https://cdn.rsvapp.com/rsvappSilentPrint.bat" target="_blank" class="btn btn-link">Descargar agente</a>
                    </div>
                </div>
            </div>
            <!--<h2>Historial de Trabajos de Impresión</h2>
            <table class="table table-bordered" id="printHistory">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Contenido</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
              </tbody>
            </table>-->
        </div>
`);    
var rsv_client_print = {
    check_interval: 5000,
    jobs_check_timeout: null,
    first_load_time: null,
    last_print_server_version: null,
    _ls_key: 'rsvapp_printer-station-token',
    _init: () => {
        rsv_client_print.token = localStorage.getItem(rsv_client_print._ls_key)
    },
    check_token: function (){
        if (this.token) {
            $(".connected-client").collapse("show");
            $(".setup-client").collapse("hide");
            this.check_jobs(1, 1);
        }else{
            $(".connected-client").collapse("hide");
            $(".setup-client").collapse("show");
        }
        
    },
    disconnect_station: function (){
        localStorage.removeItem(this._ls_key);
        document.location.reload(true);
    },
    addHistoryRow: function (job) {
        const row = `
          <tr>
            <td>${job.id}</td>
            <td>${job.content}</td>
            <td>${job.status}</td>
            <td>${job.date}</td>
          </tr>
        `;
        $('#printHistory tbody').append(row);
    },
    check_jobs: function (loop = 1, is_first_load = 0) {
        $.ajax({
          url: 'https://api.rsvapp.com/v2/print_server/jobs/', // URL del backend para obtener trabajos de impresión
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + this.token },
          success: function(response) {
           station_data = response.data;
           if(is_first_load){
            setTimeout(() => {rsv_client_print.print_receipt_browser("https://api.rsvapp.com/v2/print_server/test/"+station_data.station.uuid, 1);}, 500);
            first_load_time = new Date().toLocaleString("es-MX");
           }
           station_data.jobs.forEach(function(job) {
                rsv_client_print.print_job(job);
    
                $.ajax({
                    url: `https://api.rsvapp.com/v2/print_server/jobs/${job.id}`,
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + rsv_client_print.token },
                    data: { status: 'printed' },
                    success: function() {
                        
                    }
                });
            });
            $(".station-info").html(`<span class="">${station_data.station.name}<br><code>${station_data.station.uuid}</code><br><small>Conectado desde ${first_load_time}</small></span>`);
            
            if(rsv_client_print.last_print_server_version)
                if(station_data.config.VERSION != rsv_client_print.last_print_server_version)
                    document.location.reload(true);
                    
            rsv_client_print.last_print_server_version = station_data.config.VERSION;
                
            if(loop){
                clearTimeout(rsv_client_print.jobs_check_timeout);
                rsv_client_print.jobs_check_timeout = setTimeout(()=>{rsv_client_print.check_jobs(1)}, station_data.config.CHECK_INTERVAL);
            }
          },
          error: function(response){
              // alert(response);
              if(loop){
                  setTimeout(()=>{rsv_client_print.check_jobs(1)}, 5000);
              }
          }
        });
        
    },
    print_receipt_browser: function (url, alarm_detection = 1) {
    	var iframe = document.createElement('iframe');
    	iframe.style.position = 'fixed';
    	iframe.style.width = 'auto';
    	iframe.style.height = 'auto';
    	iframe.style.opacity = 0;
    	iframe.top = -2000;
    	iframe.left = -2000;
    	iframe.src = url;
    	document.body.appendChild(iframe);
      console.log('print event started');
      
         	
      iframe.onload = function() {
        if(alarm_detection){
          const print_start = performance.now();
          var mediaQueryList = iframe.contentWindow.matchMedia('print');
          mediaQueryList.addListener(function (mql) {
            console.log('print event', mql);
            const print_end = performance.now();
            if((print_end - print_start) > 10000){
              alert("El navegador no está ejecutado en modo de impresión automática. Por favor, descargue o ejecute el agente de impresión de esta página");
            }
          });
        }
    		setTimeout(() => {
    			iframe.contentWindow.print();
    		}, 500);
    	};
    
    },
    print_job:  function (job_data) {
        if(job_data.type == "url")
            this.print_receipt_browser('/proxy/'+job_data.content);
        console.log('Printing:', job_data.content);
    },

};
   
$(".ps_token-digit", $rsv_ps_wrapper).on("focus", function(e){
    var inputs = $('.ps_token-digit');
    var currentIndex = inputs.index(this);

    for (var i = 0; i < currentIndex; i++) {
        if (inputs.eq(i).val() === '') {
            inputs.eq(i).focus();
            return;
        }
    }
});
$(".ps_token-digit", $rsv_ps_wrapper).on("keyup", function(e){
    _val = $(this).val();
    var key = e.keyCode || e.charCode;

    if(_val.length == 0 && ( key == 8 || key == 46 )){
        $(this).prev('.ps_token-digit').focus();
    }
    
    if(_val.length > 0){
        e.preventDefault();
        e.stopPropagation();
        
        $(this).next('.ps_token-digit').focus();
        if(_val.length > 1)
            $(this).val(_val.substr(_val.length - 1));
        
        if($(this).is(':last-child'))
            $(this).parent("form").submit();
        
    }
       

});
$(".disconnect-station", $rsv_ps_wrapper).on("click", function(){
    rsv_client_print.disconnect_station();
    return false;
})
$(".print-test", $rsv_ps_wrapper).on("click", function(){
    var data = {
        type: "url", 
        content: "https://api.rsvapp.com/v2/print_server/test/"+station_data.station.uuid, 
        sent_by: "station:"+station_data.station.uuid, 
        station: station_data.station.id, 
    };

    fetch('https://api.rsvapp.com/v2/print_server/jobs/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if(data.code == 200){
            alert("Se envió la solicitud de impresión correctamente");
        }else{
            alert(data.message);
        }
        console.log('Success:', data);
    })
    .catch((error) => {
        if("message" in error)
            alert(error.message);
        else
            alert("Ocurrió un error al generar impresión. Contacte a soporte");
            
        console.error('Error:', error);
    });

	return false;
})
$("#sync-print-station", $rsv_ps_wrapper).on("submit", function(e){
    _token = "";
    $(".ps_token-digit").each(function(){
        _token += $(this).val();
    });
    
    $.ajax({
        url:"https://api.rsvapp.com/v2/print_server/sync/",
        type: "POST",
        data: "token="+_token,
        success: function(response){
            _token = response.data.token ;
            console.log(_token);
            rsv_client_print.token = _token;
            localStorage.setItem(rsv_client_print._ls_key, _token);
            rsv_client_print.check_token();
        }
    })
    
    e.preventDefault();
    e.stopPropagation();
    
    return;
});
$("body").append(`    <style>
        .ps_success-checkmark {
  width: 80px;
  height: 115px;
  margin: 0 auto;
}
.ps_success-checkmark .check-icon {
  width: 80px;
  height: 80px;
  position: relative;
  border-radius: 50%;
  box-sizing: content-box;
  border: 4px solid #4CAF50;
}
.ps_success-checkmark .check-icon::before {
  top: 3px;
  left: -2px;
  width: 30px;
  transform-origin: 100% 50%;
  border-radius: 100px 0 0 100px;
}
.ps_success-checkmark .check-icon::after {
  top: 0;
  left: 30px;
  width: 60px;
  transform-origin: 0 50%;
  border-radius: 0 100px 100px 0;
  animation: ps_rotate-circle 4.25s ease-in;
}
.ps_success-checkmark .check-icon::before, .ps_success-checkmark .check-icon::after {
  content: "";
  height: 100px;
  position: absolute;
  /*background: #FFFFFF;*/
  transform: rotate(-45deg);
}
.ps_success-checkmark .check-icon .icon-line {
  height: 5px;
  background-color: #4CAF50;
  display: block;
  border-radius: 2px;
  position: absolute;
  z-index: 10;
}
.ps_success-checkmark .check-icon .icon-line.line-tip {
  top: 46px;
  left: 14px;
  width: 25px;
  transform: rotate(45deg);
  animation: ps_icon-line-tip 0.75s;
}
.ps_success-checkmark .check-icon .icon-line.line-long {
  top: 38px;
  right: 8px;
  width: 47px;
  transform: rotate(-45deg);
  animation: ps_icon-line-long 0.75s;
}
.ps_success-checkmark .check-icon .icon-circle {
  top: -4px;
  left: -4px;
  z-index: 10;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  position: absolute;
  box-sizing: content-box;
  border: 4px solid rgba(76, 175, 80, 0.5);
}
.ps_success-checkmark .check-icon .icon-fix {
  top: 8px;
  width: 5px;
  left: 26px;
  z-index: 1;
  height: 85px;
  position: absolute;
  transform: rotate(-45deg);
  /*background-color: #FFFFFF;*/
}

@keyframes ps_rotate-circle {
  0% {
    transform: rotate(-45deg);
  }
  5% {
    transform: rotate(-45deg);
  }
  12% {
    transform: rotate(-405deg);
  }
  100% {
    transform: rotate(-405deg);
  }
}
@keyframes ps_icon-line-tip {
  0% {
    width: 0;
    left: 1px;
    top: 19px;
  }
  54% {
    width: 0;
    left: 1px;
    top: 19px;
  }
  70% {
    width: 50px;
    left: -8px;
    top: 37px;
  }
  84% {
    width: 17px;
    left: 21px;
    top: 48px;
  }
  100% {
    width: 25px;
    left: 14px;
    top: 45px;
  }
}
@keyframes ps_icon-line-long {
  0% {
    width: 0;
    right: 46px;
    top: 54px;
  }
  65% {
    width: 0;
    right: 46px;
    top: 54px;
  }
  84% {
    width: 55px;
    right: 0px;
    top: 35px;
  }
  100% {
    width: 47px;
    right: 8px;
    top: 38px;
  }
}
  .ps_token-digit{
                    width: 1.25em;
                    height: 1.5em;
                    margin: 0 0.1em;
                    padding: 0.25em;
                    font-size: 2em;
                    text-align: center;
                    display: inline-block;
                }
    </style>`);

$(document).ready(function(){
    rsv_client_print.check_token();
});

$(document).ready(function() {
  if (typeof rsv_client_print !== 'undefined' && typeof rsv_client_print._init === 'function') {
      rsv_client_print._init();
  } else {
      console.error('rsv_client_print o rsv_client_print._init() no está definido.');
  }
});