const { useState, useContext, useMemo, useEffect } = React;

const AppContext = React.createContext();

const additionalChargesData = [
  {
    id: 'pdl01',
    text: 'ΠΑΡΑΔΟΣΗ-ΠΑΡΑΛΑΒΗ',
  },
  {
    id: 'pdl02',
    text: 'ΠΑΡΑΔΟΣΗ ΣΑΒBΑΤΟΥ',
  },
  {
    id: 'pdl03',
    text: 'ΠΑΡΑΔΟΣΗ RECEPTION',
  },
];
const COD_METHOD_NAMES = [
  'cash on delivery',
  'cod',
  'αντικαταβολή',
  'αντικαταβολη',
];
const urlSearchParams = new URLSearchParams(window.location.search);
//route=extension/module/gt_courier/save_settings
const gtCourierModuleRoute = 'extension/module/gt_courier';
const orderHistoryRoute = 'api/order/history';
const userToken = urlSearchParams.get('token');
const orderId = urlSearchParams.get('order_id');
const moduleLink = `${window.location.origin}${window.location.pathname}?route=${gtCourierModuleRoute}&token=${userToken}`;

const isPaymentMethodCOD = (str) => {
  return COD_METHOD_NAMES.includes(str.toLowerCase());
};

function getGtCourierOrderStatusId() {
  const options = $('#input-order-status').find('option');
  let gtCourierStatusId = -1;
  options.each(function () {
    const text = $(this).text();
    const value = $(this).val();
    if (text == 'GT Courier Voucher') gtCourierStatusId = value;
    return;
  });
  return gtCourierStatusId;
}

const App = () => {
  const [order, setOrder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isCOD, setIsCOD] = useState(false);
  const [additionalCharges, setAdditionlCharges] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [voucher, setVoucher] = useState('');
  const [voucherUrl, setVoucherUrl] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [openVoucherOnNewTab, setOpenVoucherOnNewTab] = useState(false);

  const orderTotal = parseFloat(order.total).toFixed(2);

  useEffect(async () => {
    await getOrderInfo();
  }, []);

  const getOrderInfo = async () => {
    setLoading(true);
    const url = `${window.location.origin}${window.location.pathname}?route=${gtCourierModuleRoute}/get_order_info&token=${userToken}&order_id=${orderId}`;
    const rawResponse = await fetch(url);
    const response = await rawResponse.json();
    setLoading(false);

    if (response.status !== 200) {
      setAlerts([{ text: response.msg, type: 'alert-danger' }, ...alerts]);
      return;
    }

    if (response.data.voucher) {
      setVoucher(response.data.voucher);
    }

    if (response.data.has_settings == 'false') {
      setDisabled(true);
    }

    setOrderNotes(response.data.comment);
    setOrder(response.data);
    setIsCOD(isPaymentMethodCOD(response.data.payment_method));
  };

  const handleAdditionalChargesChange = (e, itemToAdd) => {
    let filteredAdditionalCharges = additionalCharges.filter(
      (item) => item !== itemToAdd.id
    );
    if (e.target.checked) filteredAdditionalCharges.push(itemToAdd.id);
    setAdditionlCharges(filteredAdditionalCharges);
  };

  const handleOnSubmit = async () => {
    setLoading(true);
    const voucherData = createVoucherData();
    const voucherRawResponse = await createVoucher(voucherData);
    const voucherResponse = await voucherRawResponse.json();
    setLoading(false);

    if (voucherResponse.status !== 201) {
      voucherResponse.data.forEach(({ error }) => {
        addAlert(error.title);
      });
      return;
    }

    const voucherUrl = createVoucherPdfUrl(
      voucherResponse.data.p01,
      //voucherResponse.data.nr01,
      voucherResponse.sid
    );
    if (openVoucherOnNewTab) openVoucherPfg(voucherUrl);
    await saveOrderGTVoucher(voucherResponse.data.p01);
  };

  const openVoucherPfg = (url) => {
    window.open(url);
  };

  const createVoucherPdfUrl = (voucher, sid) => {
    const voucherId = voucher.split('-')[1];
    var voucherUrl =
      'https://login.gtcourier.gr/hermes_api/courier/print_voucher';

    var voucherUrlParamsObj = {
      hcou01nr01: 1801,
      position: 1,
      voucher: voucher, // voucher p01
      'voucher[1]': voucherId, // voucher id nr01
      sid: sid, // session id
    };

    var voucherUrlParams = new URLSearchParams(voucherUrlParamsObj).toString();
    voucherUrl += '?' + voucherUrlParams;

    setVoucher(voucher);
    setVoucherUrl(voucherUrl);

    return voucherUrl;
  };

  const createVoucher = async (voucherData) => {
    const url = `${window.location.origin}${window.location.pathname}?route=${gtCourierModuleRoute}/create_voucher&token=${userToken}&order_id=${orderId}`;

    const response = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams(voucherData),
    });

    return response;
  };

  const createVoucherData = () => {
    const deliveryAddress = order.delivery_address;

    const voucherData = {
      p126: 2, // type
      p0201: deliveryAddress.first_name + ' ' + deliveryAddress.last_name,
      p0204country: deliveryAddress.country,
      p0202: deliveryAddress.address_1 + ' ' + deliveryAddress.address_2,
      p0203: deliveryAddress.city,
      p0208: deliveryAddress.postcode,
      p0206: order.telephone,
      p0210: order.email,
      p101: parseFloat(order.weight) > 0 ? order.weight : 0.2,
      p0107: orderNotes,
      lang: 'GR',
    };

    voucherData.p022 = isCOD ? orderTotal : 0.0;

    if (order.gt_route_code != ' ') voucherData.p0100 = order.gt_route_code;

    // add additional charges
    additionalCharges.forEach((item) => (voucherData[item] = 1));

    return voucherData;
  };

  const saveOrderGTVoucher = async (voucher) => {
    const pathname = window.location.pathname.replace('admin/', '');
    const url = `${window.location.origin}${pathname}?route=${orderHistoryRoute}&token=${token}&store_id=${order.store_id}&order_id=${orderId}`;

    const status = {
      order_status_id: getGtCourierOrderStatusId(),
      notify: 0,
      override: 0,
      append: 0,
      comment: voucher,
    };

    await fetch(url, {
      method: 'POST',
      body: new URLSearchParams(status),
    });
  };
  const handleOnPrintVoucher = async () => {
    if (voucherUrl) {
      openVoucherPfg(voucherUrl);
      return;
    }

    setLoading(true);
    const url = `${window.location.origin}${window.location.pathname}?route=${gtCourierModuleRoute}/get_session_id&token=${userToken}&order_id=${orderId}`;
    const responseRaw = await fetch(url);
    const response = await responseRaw.json();

    if (response.status !== 200) {
      addAlert(response.msg);
      return;
    }

    const session = response.sid;
    const pdfUrl = createVoucherPdfUrl(voucher, session);
    openVoucherPfg(pdfUrl);
    setLoading(false);
  };

  const addAlert = (alert) => {
    setAlerts([{ text: alert, type: 'alert-info' }, ...alerts]);
  };

  const additionalChargesList = additionalChargesData.map((item, index) => {
    return (
      <div className='checkbox' key={index}>
        <label>
          <input
            type='checkbox'
            onChange={(e) => handleAdditionalChargesChange(e, item)}
          />{' '}
          <span> {item.text}</span>
        </label>
      </div>
    );
  });

  const alertList = alerts.map((alert, index) => {
    return (
      <div className={`alert ${alert.type} alert-dismissible`} key={index}>
        {alert.text}
        <button type='button' className='close' data-dismiss='alert'>
          ×
        </button>
      </div>
    );
  });

  return (
    <Modal
      onSubmit={handleOnSubmit}
      onPrintVoucher={handleOnPrintVoucher}
      loading={loading}
      voucher={voucher}
      disabled={disabled}>
      {alerts.length > 0 && <div className='form-group '>{alertList}</div>}

      <div className='form-group '>
        <label>Αποστολή με αντικαταβολή ?</label>
        <div className='checkbox'>
          <label>
            {order && (
              <>
                <input
                  type='checkbox'
                  checked={isCOD}
                  onChange={(e) => setIsCOD((prevState) => !prevState)}
                />{' '}
                <span>
                  {' '}
                  ({isCOD ? 'Ναι' : 'Οχι'}) Σύνολο{' '}
                  {parseFloat(order.total).toFixed(2)} {order.currency_code}
                </span>
              </>
            )}
          </label>
        </div>
      </div>

      <div className='form-group '>
        <label>Επιπλέον πεδία</label>
        {additionalChargesList}
      </div>

      <div className='form-group'>
        <label for='gt_order_comments'>Σημειώσεις παραγγελίας</label>
        <textarea
          class='form-control'
          id='gt_order_comments'
          rows='3'
          onChange={(e) => setOrderNotes(e.target.value)}
          value={orderNotes}></textarea>
      </div>

      <div className='form-group'>
        <label>Άνοιγμα voucher σε νέα καρτέλα κατά την δημιουργία</label>
        <div className='checkbox'>
          <label>
            <input
              type='checkbox'
              checked={openVoucherOnNewTab}
              onChange={(e) =>
                setOpenVoucherOnNewTab((prevState) => !prevState)
              }
            />{' '}
            ({openVoucherOnNewTab ? 'Ναι' : 'Οχι'})
          </label>
        </div>
      </div>

      {/* <div className='form-group'>
        <label for='gt_order_comments'>Υπάρχων Voucher</label>
        <input value={voucher} className='form-control' readonly />
      </div> */}
    </Modal>
  );
};

const Modal = ({
  children,
  onSubmit,
  onPrintVoucher,
  loading,
  voucher,
  disabled,
}) => {
  const footerBtns = () => {
    if (disabled) {
      return (
        <div className='alert alert-danger text-left'>
          Παρακαλώ εισάγετε τα στοιχεία του λογαριασμού σας.{' '}
          <a href={moduleLink}>Ρυθμίσεις</a>
        </div>
      );
    }
    if (loading) {
      return (
        <button type='button' className='btn btn-secondary'>
          Loading...
        </button>
      );
    }

    if (!loading) {
      return (
        <>
          <div className='pull-left'>
            <button
              type='button'
              className='btn btn-secondary'
              data-dismiss='modal'>
              Κλείσιμο
            </button>
          </div>

          {/* {voucher && (
            <button
              type='button'
              className='btn btn-primary'
              onClick={() => onPrintVoucher()}>
              Εκτύπωση υπάρχων Voucher
            </button>
          )} */}

          <button
            type='button'
            className={`btn ${voucher ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => onSubmit()}>
            {voucher ? 'Δημιουργία νέου Voucher' : 'Δημιουργία Voucher'}
          </button>
        </>
      );
    }
  };

  return (
    <div
      className='modal fade'
      id='gtCourierVoucherModal'
      tabindex='-1'
      role='dialog'
      aria-labelledby='gtCourierVoucherModal'
      aria-hidden='true'>
      <div className='modal-dialog' role='document'>
        <div className='modal-content'>
          <div className='modal-header'>
            <button
              type='button'
              className='close'
              data-dismiss='modal'
              aria-label='Close'>
              <span aria-hidden='true'>&times;</span>
            </button>
            <h5 className='modal-title'>GT Courier Voucher</h5>
          </div>
          <div className='modal-body p-4'>{children}</div>

          <div className='modal-footer'>{footerBtns()}</div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('gtCourierVoucher'));
