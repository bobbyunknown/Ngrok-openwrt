/*
 * This is open source software, licensed under the MIT License.
 * https://opensource.org/license/mit
 * 
 * Copyright (C) 2024 BobbyUnknown
 *
 * Description:
 * This software provides a secure tunneling application for OpenWrt.
 * The application allows users to configure and manage ngrok tunnels
 * on their OpenWrt router, enabling secure remote access to local
 * network services through public endpoints. It features a user-friendly
 * web interface for easy tunnel management and configuration.
 */

'use strict';
'require view';
'require fs';
'require ui';

return view.extend({
    refreshInterval: null,

    load: function() {
        return Promise.all([
            L.resolveDefault(fs.read('/var/log/ngrok/scripts.log'), ''),
            L.resolveDefault(fs.read('/var/log/ngrok/ngrok.log'), '')
        ]);
    },

    refreshLogs: function() {
        return this.load().then(function(data) {
            document.getElementById('scriptlog').textContent = data[0] || _('No script log available');
            document.getElementById('ngroklog').textContent = data[1] || _('No ngrok log available');
        });
    },

    render: function(data) {
        var scriptlog = data[0] || '';
        var ngroklog = data[1] || '';

        var interval = 5000;
        this.refreshInterval = setInterval(L.bind(this.refreshLogs, this), interval);

        var logStyle = 'white-space: pre-wrap; overflow-y: auto; height: 300px; ' +
            'background-color: #1e1e1e; color: #e0e0e0; ' +
            'padding: 10px; font-family: monospace; font-size: 12px; ' +
            'border: 1px solid #444; margin-bottom: 20px;';

        return E('div', { 'class': 'cbi-map' }, [
            E('h2', {}, [ _('Ngrok Log') ]),
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'style': 'width: 100%;' }, [
                    E('h3', _('Script Log')),
                    E('pre', { 'id': 'scriptlog', 'style': logStyle }, [ scriptlog || _('No script log available') ])
                ]),
                E('div', { 'style': 'width: 100%;' }, [
                    E('h3', _('Ngrok Log')),
                    E('pre', { 'id': 'ngroklog', 'style': logStyle }, [ ngroklog || _('No ngrok log available') ])
                ])
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('button', {
                    'class': 'cbi-button cbi-button-remove',
                    'click': ui.createHandlerFn(this, function() {
                        return Promise.all([
                            fs.write('/var/log/ngrok/scripts.log', ''),
                            fs.write('/var/log/ngrok/ngrok.log', '')
                        ]).then(function() {
                            document.getElementById('scriptlog').textContent = _('Log cleared');
                            document.getElementById('ngroklog').textContent = _('Log cleared');
                            ui.addNotification(null, E('p', _('Logs have been cleared')), 'success');
                        }).catch(function(error) {
                            ui.addNotification(null, E('p', _('Failed to clear logs: ') + error.message), 'error');
                        });
                    })
                }, _('Clear Logs'))
            ])
        ]);
    },
    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
