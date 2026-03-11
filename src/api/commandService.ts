import apiClient from './client';

type CommandType = 'engineStop' | 'engineResume' | 'positionSingle' | 'reboot';

export const sendDeviceCommand = async (deviceId: number, command: CommandType) => {
    return apiClient.post(`/billing/devices/send-command/${deviceId}/command`, { command });
};