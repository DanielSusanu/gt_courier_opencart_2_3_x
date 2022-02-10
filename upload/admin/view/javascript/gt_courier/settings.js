const { useState, useContext, useCallback, useEffect } = React;

const AppContext = React.createContext();

const DEFAULT_OPTIONS = {
  headers: { 'Content-Type': 'application/json' },
};
const saved_settings = {
  gt_courier_username: gt_courier_settings.module_gt_courier_username || '',
  gt_courier_password: gt_courier_settings.module_gt_courier_password || '',
  gt_courier_route_code: gt_courier_settings.module_gt_courier_route_code || '',
};

const gtModuleSaveSettingsLink = `${gt_module_save_settings_link}&token=${token}`;
const orderStatusAddLink = `${order_status_add_link}&token=${token}`;

const App = () => {
  const [username, setUsername] = useState(saved_settings.gt_courier_username);
  const [password, setPassword] = useState(saved_settings.gt_courier_password);
  const [routeCode, setRouteCode] = useState(
    saved_settings.gt_courier_route_code
  );
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const handleFormSumbit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const settings = {
      module_gt_courier_username: username,
      module_gt_courier_password: password,
      module_gt_courier_route_code: routeCode,
    };

    const rawResponse = await fetch(gtModuleSaveSettingsLink, {
      method: 'POST',
      body: new URLSearchParams(settings),
    });
    const content = await rawResponse.json();
    let alertType = 'alert-success';
    if (content.status !== 200) alertType = 'alert-danger';

    setAlerts([{ text: content.msg, type: alertType }, ...alerts]);
    setLoading(false);

    // add order status for voucher
    if (is_order_status_added == 'false') await addOrderStatus();
  };

  const addOrderStatus = async () => {
    const status = {
      'order_status[1][name]': 'GT Courier Voucher',
    };
    await fetch(orderStatusAddLink, {
      method: 'POST',
      body: new URLSearchParams(status),
    });
  };

  const alertList = alerts.map((alert, index) => {
    return (
      <div className={`alert ${alert.type} alert-dismissible`} key={index}>
        {alert.type != 'alert-danger' && <i className='fa fa-check-circle'></i>}{' '}
        {alert.text}
        <button type='button' className='close' data-dismiss='alert'>
          ×
        </button>
      </div>
    );
  });

  return (
    <>
      <div className='row'>
        <div className='col-sm-12'>{alertList}</div>
      </div>
      <div className='row'>
        <div className='col-sm-4'>
          <form onSubmit={(e) => handleFormSumbit(e)}>
            <div className='form-group'>
              <label for='username'>Όνομα Χρήστη:</label>
              <input
                type='text'
                className='form-control'
                id='username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                requied
              />
            </div>
            <div className='form-group'>
              <label for='routeCode'>Route Code: προαιρετικό</label>
              <input
                type='text'
                className='form-control'
                id='routeCode'
                value={routeCode}
                onChange={(e) => setRouteCode(e.target.value)}
              />
            </div>
            <div className='form-group'>
              <label for='password'>Κωδικός:</label>
              <input
                type='password'
                className='form-control'
                id='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type='submit'
              className='btn btn-primary'
              disabled={`${loading ? 'disabled' : ''}`}>
              Αποθηκευση
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

function useFetch(url, options = {}, dependencies = []) {
  return useAsync(() => {
    return fetch(url, { ...DEFAULT_OPTIONS, ...options }).then((res) => {
      if (res.ok) return res.json();
      return res.json().then((json) => Promise.reject(json));
    });
  }, dependencies);
}

function useAsync(callback, dependencies = []) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [value, setValue] = useState();

  const callbackMemoized = useCallback(() => {
    setLoading(true);
    setError(undefined);
    setValue(undefined);
    callback()
      .then(setValue)
      .catch(setError)
      .finally(() => setLoading(false));
  }, dependencies);

  useEffect(() => {
    callbackMemoized();
  }, [callbackMemoized]);

  return { loading, error, value };
}

ReactDOM.render(<App />, document.getElementById('settingsRoot'));
