<?php
class ControllerExtensionModuleGtCourier extends Controller
{   
    //https://forum.opencart.com/viewtopic.php?t=103230

    private $error = array();
    private $gt_courier_domain_root = "https://login.gtcourier.gr";
    private $hermes_endpoint_login = "/hermes_api/kernel/login";
    private $hermes_endpoint_logout = "/hermes_api/kernel/logout";
    private $hermes_endpoint_create_voucher = "/hermes_api/courier/r18";
    private $hermes_endpoint_make_zone_area = "/hermes_api/courier/r18";

    public function index()
    {
        $this->load->language('extension/module/gt_courier');
        $this->load->model('setting/setting');
        $this->load->model('localisation/order_status');

		

        $data['header'] = $this->load->controller('common/header');
        $data['column_left'] = $this->load->controller('common/column_left');
        $data['footer'] = $this->load->controller('common/footer');        
    
        // Add gt courier settings into the page
        $settings = $this->model_setting_setting->getSetting('module_gt_courier'); 
        if($settings == null){
            $settings['module_gt_courier_username'] = '';
            $settings['module_gt_courier_route_code'] = '';
            $settings['module_gt_courier_password'] = '';
        }
        $data['gt_courier_settings'] = json_encode($settings);

        // add gt courier order status for voucher
        $order_statuses = $this->model_localisation_order_status->getOrderStatuses();
        $is_order_status_added="false";
        foreach ($order_statuses as $order_status) {
            if($order_status['name'] == 'GT Courier Voucher'){
                $is_order_status_added="true";
            }
        }
        $data['is_order_status_added'] = $is_order_status_added;
        // add link to create order status        
        $data['order_status_add_link'] = $this->url->link('localisation/order_status/add', '' , true);

        $data['gt_module_save_settings_link'] = $this->url->link('extension/module/gt_courier/save_settings', '' , true);
        $data['token'] = $this->session->data['token'];

        $data['breadcrumbs'] = array();

		$data['breadcrumbs'][] = array(
			'text' => $this->language->get('text_home'),
			'href' => $this->url->link('common/dashboard', 'token=' . $this->session->data['token'], true)
		);

		$data['breadcrumbs'][] = array(
			'text' => $this->language->get('text_extension'),
			'href' => $this->url->link('marketplace/extension', 'token=' . $this->session->data['token'] . '&type=module', true)
		);

		if (!isset($this->request->get['module_id'])) {
			$data['breadcrumbs'][] = array(
				'text' => $this->language->get('heading_title'),
				'href' => $this->url->link('extension/module/gt_courier', 'token=' . $this->session->data['token'], true)
			);
		} else {
			$data['breadcrumbs'][] = array(
				'text' => $this->language->get('heading_title'),
				'href' => $this->url->link('extension/module/gt_courier', 'token=' . $this->session->data['token'] . '&module_id=' . $this->request->get['module_id'], true)
			);
		}


        

        $this->response->setOutput($this->load->view('extension/module/gt_courier', $data));
    }


    protected function validate() {
        if (!$this->user->hasPermission('modify', 'extension/module/gt_courier')) {
			$this->error['warning'] = $this->language->get('error_permission');
		}
		return !$this->error;
    }

    public function get_order_info(){
        $this->load->model('setting/setting');
        $this->load->model('sale/order');
        $this->response->addHeader('Content-Type: application/json');
        $errorResponseJson = array();
        $errorResponseJson['msg']='Error';
        $errorResponseJson['status']=500;

        $settings = $this->model_setting_setting->getSetting('module_gt_courier'); 

       
        if(!$this->validate()){
            $this->response->setOutput(json_encode($errorResponseJson));
            return;
        }
        if ($this->request->server['REQUEST_METHOD'] != 'GET') {
            $this->response->setOutput(json_encode($errorResponseJson));
            return;
        }                
        if (!isset($_GET['order_id'])) {
            $this->response->setOutput(json_encode($errorResponseJson));
            return;            
        }
        $order_id = $_GET['order_id'];

        $order_info = $this->model_sale_order->getOrder($order_id);
    
        if (empty($order_info)){
            $this->response->setOutput(json_encode($errorResponseJson));
            return;    
        }      

        $invoice_address = array(
            'first_name' => $order_info['payment_firstname'],
            'last_name'  => $order_info['payment_lastname'],
            'company'   => $order_info['payment_company'],
            'address_1' => $order_info['payment_address_1'],
            'address_2' => $order_info['payment_address_2'],
            'city'      => $order_info['payment_city'],
            'postcode'  => $order_info['payment_postcode'],
            'zone'      => $order_info['payment_zone'],
            'zone_code' => $order_info['payment_zone_code'],
            'country'   => $order_info['payment_country']
        );

        $delivery_address = array(
            'first_name' => $order_info['shipping_firstname'],
            'last_name'  => $order_info['shipping_lastname'],
            'company'   => $order_info['shipping_company'],
            'address_1' => $order_info['shipping_address_1'],
            'address_2' => $order_info['shipping_address_2'],
            'city'      => $order_info['shipping_city'],
            'postcode'  => $order_info['shipping_postcode'],
            'zone'      => $order_info['shipping_zone'],
            'zone_code' => $order_info['shipping_zone_code'],
            'country'   => $order_info['shipping_country']
        );

        $totals = $this->model_sale_order->getOrderTotals($order_id);

        $router_code ="";
        $has_settings="false";

        if($settings != null){
            $router_code = $settings['module_gt_courier_route_code'];
            $has_settings="true";            
        }

        $data['currency_code'] = $order_info['currency_code'];
        $data['currency_value'] = $order_info['currency_value'];
        $data['delivery_address'] =  $delivery_address;
        $data['invoice_address'] = $invoice_address;
        $data['comment'] = $order_info['comment'];
        $data['telephone'] = $order_info['telephone'];
        $data['payment_method'] =  $order_info['payment_method'];
        $data['totals'] = $totals;
        $data['gt_route_code'] =  $router_code;
        $data['email'] = $order_info['email'];
        $data['store_id']= $order_info['store_id'];
        $data['has_settings'] = $has_settings;

        foreach ($totals as $total) {
            if($total['code'] == 'total'){
                $data['total'] = $total['value'];
            }
        }


        $this->load->model('sale/order');
		$histories = $this->model_sale_order->getOrderHistories($order_id, 0, 20);
		foreach ($histories as $history) {
            if($history['status'] == 'GT Courier Voucher'){
                $data['voucher']=$history['comment'];
                break;
            }			
		}

        $response=array();
        $response['status']=200;
        $response['data']=$data;        

        $this->response->setOutput(json_encode($response));            
        
    }

   public function save_settings(){
    $this->load->model('setting/setting');
    $this->response->addHeader('Content-Type: application/json');
    
    if (($this->request->server['REQUEST_METHOD'] == 'POST') && $this->validate()) {
        $post = $this->request->post;
        

        $gt_courier_username= $post['module_gt_courier_username'];
        $gt_courier_password= $post['module_gt_courier_password'];
        $gt_courier_route_code= $post['module_gt_courier_route_code'];

        $responseJson = array();
     
        $loginResponse = $this->hermes_login($gt_courier_username,$gt_courier_password );

        if($loginResponse['status'] !== 200){
            $responseJson['msg']='Ο κωδικός η το όνομα είναι λάθος';
            $responseJson['status']=$loginResponse['status'];
            $this->response->setOutput(json_encode($responseJson));
        }else{            
            $this->model_setting_setting->editSetting('module_gt_courier', $post, $this->store_id);
            $responseJson['msg']='Επιτυχής σύνδεσης!';
            $responseJson['status']=200;            
            $this->response->setOutput(json_encode($responseJson));
        }
    }
   }

   public function create_voucher(){
    $this->load->model('setting/setting');
    $this->response->addHeader('Content-Type: application/json');
    $responseJson = array();

    if (($this->request->server['REQUEST_METHOD'] == 'POST') && $this->validate()) {
        $post = $this->request->post;
        $settings = $this->model_setting_setting->getSetting('module_gt_courier'); 

        $gt_courier_username= $settings['module_gt_courier_username'];
        $gt_courier_password= $settings['module_gt_courier_password'];

        $loginResponse = $this->hermes_login($gt_courier_username,$gt_courier_password );

        if($loginResponse['status'] !== 200){
            $responseJson['msg']='Ο κωδικός η το όνομα είναι λάθος';
            $responseJson['status']=$loginResponse['status'];
            $this->response->setOutput(json_encode($responseJson));
            return;
        }

        $session_id=  $loginResponse['sid'];
        $voucherResponse = $this->hermes_create_voucher($post,$session_id);
        $voucherResponse['sid']=$session_id;
        $this->response->setOutput(json_encode($voucherResponse));
    }
   }

   public function get_session_id(){
    $this->load->model('setting/setting');
    $this->response->addHeader('Content-Type: application/json');
    $responseJson = array();

    if (($this->request->server['REQUEST_METHOD'] == 'GET') && $this->validate()) {        
        $settings = $this->model_setting_setting->getSetting('module_gt_courier'); 
        $gt_courier_username= $settings['module_gt_courier_username'];
        $gt_courier_password= $settings['module_gt_courier_password'];

        $loginResponse = $this->hermes_login($gt_courier_username, $gt_courier_password);

        if($loginResponse['status'] !== 200){
            $responseJson['msg']='Ο κωδικός η το όνομα είναι λάθος, παρακαλώ ελέγξτε τα στοιχεία σας στις ρυθμίσεις του plugin.';
            $responseJson['status']=$loginResponse['status'];
            $this->response->setOutput(json_encode($responseJson));
            return;
        }

        $voucherResponse['sid']= $loginResponse['sid'];
        $voucherResponse['status']= 200;

        $this->response->setOutput(json_encode($voucherResponse));
    }
   }


   protected function hermes_create_voucher($request_data, $session_id=false){

        $response= array();        
        $url = $this->gt_courier_domain_root . $this->hermes_endpoint_create_voucher;      
        $response_data = $this->CallAPI("POST",$url, $request_data, $session_id);            
        // $response_data = array();
        // $response_data['data'] = array();
        // $response_data['data']['nr01']='30062503';
        // $response_data['data']['p01']='V-30062503';
        // $response_data['code']=201;
        //{"code":201,"data":{"nr01":"30062503","p01":"V-30062503"},"info":{"recperpage":9999999999,"page":0,"totalrec":0}}
        
        $code =  $response_data['code'];    
        $response_data['status']=$code;

        return $response_data;   
   }

   protected function hermes_login($username,$password){
        $response= array();
        $loginData = array();
        
        $loginUrl = $this->gt_courier_domain_root . $this->hermes_endpoint_login;
        $logoutUrl = $this->gt_courier_domain_root .$this->hermes_endpoint_logout;
       
        $loginData['username']=$username;
        $loginData['password']=$password;

        //$this->CallAPI("POST",$logoutUrl);
        $loginResponse = $this->CallAPI("POST",$loginUrl,$loginData);

        
        $code =  $loginResponse['code'];
        
        $response['status']=$code;

        if($code == 200){
            $sid =  $loginResponse['data']['sid'];
            $response['sid']= $sid;
        }

        return $response;
   }

   // Method: POST, PUT, GET etc
// Data: array("param" => "value") ==> index.php?param=value

protected function CallAPI($method, $url, $data = false, $session_id = false)
{
    $curl = curl_init();

    switch ($method)
    {
        case "POST":
            curl_setopt($curl, CURLOPT_POST, 1);
            
            if ($data)
                curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
            break;
        case "PUT":
            curl_setopt($curl, CURLOPT_PUT, 1);
            break;
        default:
            if ($data)
                $url = sprintf("%s?%s", $url, http_build_query($data));
    }

    // Optional Authentication:
    //curl_setopt($curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    //curl_setopt($curl, CURLOPT_USERPWD, "username:password");
    if($session_id){
        $cookie= 'Cookie: PHPSESSID=' .  $session_id;
        curl_setopt($curl, CURLOPT_HTTPHEADER, array($cookie));
    }

    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);

    $result = curl_exec($curl);

    curl_close($curl);

    if($result === FALSE) {
        die(curl_error($curl));
    }

    return json_decode($result,true);
}

}