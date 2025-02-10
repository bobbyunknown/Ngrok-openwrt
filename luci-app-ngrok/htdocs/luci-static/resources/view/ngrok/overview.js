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

return view.extend({
    load: function() {
        return Promise.all([
            fs.exec('/etc/init.d/ngrok', ['status']),
            fs.exec('/etc/ngrok/core/ngrok-status', [])
        ]);
    },

    render: function(data) {
        var m, s, o;
        var running = (data[0] && data[0].stdout) ? data[0].stdout.includes("running") : false;
        var ngrokData = {};
        
        try {
            ngrokData = JSON.parse(data[1].stdout.trim());
        } catch(e) {
            console.error('Failed to parse ngrok status:', e);
        }

        m = new form.Map('ngrok', _('Ngrok'), _('Ngrok client for OpenWRT'));
        s = m.section(form.NamedSection, 'config', 'ngrok');

        o = s.option(form.DummyValue, '_buttons');
        o.rawhtml = true;
        o.cfgvalue = function(section_id) {
            // Add spinner style
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

            var handleAction = function(btn, action, btnText) {
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
            };

            return E('div', { 'class': 'cbi-value-field' }, [
                style,
                running ? E('button', {
                    'class': 'cbi-button cbi-button-negative',
                    'click': function(ev) { return handleAction(ev.target, 'stop', _('Stop Ngrok')); }
                }, [ _('Stop Ngrok') ]) : E('button', {
                    'class': 'cbi-button cbi-button-apply',
                    'click': function(ev) { return handleAction(ev.target, 'start', _('Start Ngrok')); }
                }, [ _('Start Ngrok') ]),
                ' ',
                E('button', {
                    'class': 'cbi-button cbi-button-action',
                    'style': running ? '' : 'display:none',
                    'click': function(ev) { return handleAction(ev.target, 'restart', _('Restart Ngrok')); }
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
                fs.exec('/etc/ngrok/core/ngrok-status', []).then(function(res) {
                    try {
                        var data = JSON.parse(res.stdout.trim());
                        statusHtml.innerHTML = '';
                        
                        statusHtml.appendChild(
                            E('div', { 'class': 'tr' }, [
                                E('div', { 'class': 'td left' }, _('Service Status')),
                                E('div', { 'class': 'td left' }, 
                                    running ? E('span', { 'style': 'color:green' }, _('Running')) : 
                                            E('span', { 'style': 'color:red' }, _('Stopped')))
                            ])
                        );

                        if (running && data.status === 'online') {
                            statusHtml.appendChild(
                                E('div', { 'class': 'tr' }, [
                                    E('div', { 'class': 'td left' }, _('Version')),
                                    E('div', { 'class': 'td left' }, data.version)
                                ])
                            );
                            statusHtml.appendChild(
                                E('div', { 'class': 'tr' }, [
                                    E('div', { 'class': 'td left' }, _('Region')),
                                    E('div', { 'class': 'td left' }, 
                                        data.region + ' (' + data.latency + ')')
                                ])
                            );

                            if (data.tunnels && data.tunnels.length > 0) {
                                data.tunnels.forEach(function(tunnel) {
                                    statusHtml.appendChild(
                                        E('div', { 'class': 'tr' }, [
                                            E('div', { 'class': 'td left' }, _(tunnel.name)),
                                            E('div', { 'class': 'td left' }, [
                                                E('a', {
                                                    'href': tunnel.url,
                                                    'target': '_blank',
                                                    'rel': 'noopener noreferrer'
                                                }, tunnel.url)
                                            ])
                                        ])
                                    );
                                });
                            }
                        }
                    } catch(e) {
                        console.error('Failed to parse ngrok status:', e);
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
