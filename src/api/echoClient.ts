import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { StorageHelper } from '../utils/storageHelper';

// Necesario para que Echo use Pusher internamente
(global as any).Pusher = Pusher;

const REVERB_HOST = __DEV__ 
    ? 'localhost' 
    : 'ws.track-gpx.com.mx';

const createEchoClient = async () => {
    const token = await StorageHelper.getItem('auth_token');

    return new Echo({
        broadcaster: 'reverb',
        key: 'ygnaqsmc8wravdh0eymx',
        wsHost: REVERB_HOST,
        wsPort: __DEV__ ? 8080 : 443,
        wssPort: 443,
        forceTLS: !__DEV__,
        enabledTransports: ['ws', 'wss'],
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
};

export default createEchoClient;