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
'require form';
'require fs';
'require ui';
'require view';
'require rpc';

var callServiceList = rpc.declare({
    object: 'service',
    method: 'list',
    params: [ 'name' ],
    expect: { '': {} }
});

return view.extend({
    handleAction: function(btn, action, btnText) {
        btn.disabled = true;
        btn.innerHTML = '<div class="loading-spinner"></div> ' + btnText;

        var commands = [];
        if (action === 'start') {
            commands = ['enable', 'start'];
        } else if (action === 'stop') {
            commands = ['stop', 'disable'];
        } else {
            commands = [action];
        }

        return Promise.all(commands.map(cmd => 
            fs.exec('/etc/init.d/ngrok', [cmd])
            .then(function(res) {
                if (res.code === 0) {
                    setTimeout(function() {
                        localStorage.setItem('ngrokNotification', JSON.stringify({
                            type: 'success',
                            message: _('Ngrok has been ' + action + 'ed.')
                        }));
                        window.location.reload();
                    }, 2000);
                } else {
                    btn.disabled = false;
                    btn.innerHTML = btnText;
                    ui.addNotification(null, E('p', _('Failed to ' + action + ' Ngrok: ' + res.stderr)), 'error');
                }
            })
        )).catch(function(err) {
            btn.disabled = false;
            btn.innerHTML = btnText;
            ui.addNotification(null, E('p', _('Failed to ' + action + ' Ngrok: ' + err)), 'error');
        });
    },

    load: function() {
        return Promise.all([
            callServiceList('ngrok')
        ]);
    },

    render: function(data) {
        var m, s, o;
        var serviceData = data[0].ngrok || {};
        var running = false;
        var self = this;
        
        if (serviceData.instances && serviceData.instances.instance1) {
            running = serviceData.instances.instance1.running || false;
        }

        m = new form.Map('ngrok', _('Ngrok'), _('Ngrok client for OpenWRT'));
        s = m.section(form.NamedSection, 'config', 'ngrok');

        o = s.option(form.DummyValue, '_buttons');
        o.rawhtml = true;
        o.cfgvalue = function(section_id) {
            var style = E('style', {}, `
                .loading-spinner {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    animation: spin 1s ease-in-out infinite;
                    margin-right: 5px;
                    vertical-align: middle;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `);

            return E('div', { 'class': 'cbi-value-field' }, [
                style,
                running ? E('button', {
                    'class': 'cbi-button cbi-button-negative',
                    'click': function(ev) { return self.handleAction(ev.target, 'stop', _('Stop Ngrok')); }
                }, [ _('Stop Ngrok') ]) : E('button', {
                    'class': 'cbi-button cbi-button-apply',
                    'click': function(ev) { return self.handleAction(ev.target, 'start', _('Start Ngrok')); }
                }, [ _('Start Ngrok') ]),
                ' ',
                E('button', {
                    'class': 'cbi-button cbi-button-action',
                    'style': running ? '' : 'display:none',
                    'click': function(ev) { return self.handleAction(ev.target, 'restart', _('Restart Ngrok')); }
                }, [ _('Restart Ngrok') ])
            ]);
        };

        var storedNotification = localStorage.getItem('ngrokNotification');
        if (storedNotification) {
            var notification = JSON.parse(storedNotification);
            ui.addNotification(null, E('p', _(notification.message)), notification.type);
            localStorage.removeItem('ngrokNotification');
        }

        o = s.option(form.DummyValue, '_status');
        o.rawhtml = true;
        o.cfgvalue = function(section_id) {
            var statusHtml = E('div', { 'class': 'table', 'id': 'ngrok-status' });
            
            var updateStatus = function() {
                Promise.all([
                    L.resolveDefault(fs.exec('/usr/bin/curl', ['http://127.0.0.1:4040/api/status']), {}),
                    L.resolveDefault(fs.exec('/usr/bin/curl', ['http://127.0.0.1:4040/api/tunnels']), {})
                ]).then(function(data) {
                    try {
                        var statusData = JSON.parse(data[0].stdout || '{}');
                        var tunnelsData = JSON.parse(data[1].stdout || '{"tunnels":[]}');
                        
                        statusHtml.innerHTML = '';
                        
                        statusHtml.appendChild(
                            E('div', { 'class': 'tr' }, [
                                E('div', { 'class': 'td left' }, _('Service Status')),
                                E('div', { 'class': 'td left' }, 
                                    running ? E('span', { 'style': 'color:green' }, _('Running')) : 
                                            E('span', { 'style': 'color:red' }, _('Stopped')))
                            ])
                        );

                        if (running && statusData.status === 'online') {
                            statusHtml.appendChild(
                                E('div', { 'class': 'tr' }, [
                                    E('div', { 'class': 'td left' }, _('Version')),
                                    E('div', { 'class': 'td left' }, statusData.agent_version)
                                ])
                            );

                            if (statusData.session && statusData.session.legs && statusData.session.legs[0]) {
                                statusHtml.appendChild(
                                    E('div', { 'class': 'tr' }, [
                                        E('div', { 'class': 'td left' }, _('Region')),
                                        E('div', { 'class': 'td left' }, 
                                            statusData.session.legs[0].region + ' (' + statusData.session.legs[0].latency + ')')
                                    ])
                                );
                            }

                            if (tunnelsData.tunnels && tunnelsData.tunnels.length > 0) {
                                tunnelsData.tunnels.forEach(function(tunnel) {
                                    statusHtml.appendChild(
                                        E('div', { 'class': 'tr' }, [
                                            E('div', { 'class': 'td left' }, _(tunnel.name)),
                                            E('div', { 'class': 'td left' }, [
                                                E('a', {
                                                    'href': tunnel.public_url,
                                                    'target': '_blank',
                                                    'rel': 'noopener noreferrer'
                                                }, tunnel.public_url)
                                            ])
                                        ])
                                    );
                                });
                            }
                        }
                    } catch(e) {
                        console.error('Failed to parse ngrok API response:', e);
                    }
                });
            };
            
            updateStatus();
            if (running) {
                var interval = window.setInterval(updateStatus, 5000);
                statusHtml.addEventListener('remove', function() {
                    window.clearInterval(interval);
                });
            }

            return statusHtml;
        };

        return m.render();
    },
    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
