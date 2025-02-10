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
'require view';
'require ui';
'require fs';
'require dom';

function parseYAML(str) {
    try {
        let lines = str.split('\n');
        let config = {};
        let currentTunnel = null;

        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;

            if (line.includes(':')) {
                let parts = line.split(/:(.*)/s);
                let key = parts[0].trim();
                let value = parts[1] ? parts[1].trim() : '';

                if (key === 'authtoken' || key === 'region') {
                    config[key] = value.replace(/"/g, '').replace(/'/g, '');
                } else if (key === 'tunnels') {
                    config.tunnels = {};
                } else if (config.tunnels && !line.startsWith(' ') && !key.startsWith('proto') && !key.startsWith('addr')) {
                    currentTunnel = key;
                    config.tunnels[currentTunnel] = {};
                } else if (currentTunnel && (key.trim() === 'proto' || key.trim() === 'addr')) {
                    config.tunnels[currentTunnel][key.trim()] = value.replace(/"/g, '').replace(/'/g, '');
                }
            }
        });
        console.log('Parsed config:', config);
        return config;
    } catch(e) {
        console.error('YAML Parse error:', e);
        return {};
    }
}

return view.extend({
    load: function() {
        return fs.read('/etc/ngrok/configs/ngrok.yml').then(function(data) {
            return parseYAML(data);
        });
    },

    render: function(config) {
        var token_input, region_select;
        var tunnels = [];

        var container = E('div', { 'class': 'cbi-map' });
        
        container.appendChild(E('h2', {}, _('Ngrok Settings')));
        container.appendChild(E('p', {}, _('Configure Ngrok client for OpenWRT')));

        var authSection = E('div', { 'class': 'cbi-section' });
        authSection.appendChild(E('h3', {}, _('Authentication')));

        var tokenDiv = E('div', { 'class': 'cbi-value' });
        tokenDiv.appendChild(E('label', { 'class': 'cbi-value-title' }, _('Auth Token')));
        
        var tokenField = E('div', { 'class': 'cbi-value-field' });
        token_input = E('input', {
            'type': 'text',
            'class': 'cbi-input-text',
            'value': config.authtoken || '',
            'placeholder': _('Your Ngrok authentication token')
        });
        tokenField.appendChild(token_input);
        tokenDiv.appendChild(tokenField);
        authSection.appendChild(tokenDiv);

        var regionDiv = E('div', { 'class': 'cbi-value' });
        regionDiv.appendChild(E('label', { 'class': 'cbi-value-title' }, _('Region')));
        
        var regionField = E('div', { 'class': 'cbi-value-field' });
        region_select = E('select', { 'class': 'cbi-input-select' });
        
        var regions = [
            ['us', 'United States'],
            ['eu', 'Europe'],
            ['ap', 'Asia/Pacific'],
            ['au', 'Australia'],
            ['sa', 'South America'],
            ['jp', 'Japan'],
            ['in', 'India']
        ];

        regions.forEach(function(region) {
            var option = E('option', {
                'value': region[0]
            }, region[1]);
            
            if (config.region === region[0]) {
                option.selected = true;
            }
            
            region_select.appendChild(option);
        });

        regionField.appendChild(region_select);
        regionDiv.appendChild(regionField);
        authSection.appendChild(regionDiv);
        container.appendChild(authSection);

        var tunnelSection = E('div', { 'class': 'cbi-section' });
        tunnelSection.appendChild(E('h3', {}, _('Tunnels')));

        var table = E('table', { 'class': 'table cbi-section-table' });
        var headerRow = E('tr', { 'class': 'tr table-titles' });
        headerRow.appendChild(E('th', { 'class': 'th' }, _('Name')));
        headerRow.appendChild(E('th', { 'class': 'th' }, _('Protocol')));
        headerRow.appendChild(E('th', { 'class': 'th' }, _('Address')));
        headerRow.appendChild(E('th', { 'class': 'th cbi-section-table-cell' }, _('Actions')));
        table.appendChild(headerRow);

        if (config.tunnels) {
            Object.entries(config.tunnels).forEach(([name, tunnel]) => {
                tunnels.push({
                    name: name,
                    proto: tunnel.proto,
                    addr: tunnel.addr
                });
            });
        }

        function addTunnelRow(tunnel = { name: '', proto: 'tcp', addr: '' }) {
            var row = E('tr', { 'class': 'tr' });
            
            var nameCell = E('td', { 'class': 'td' });
            var nameInput = E('input', {
                'type': 'text',
                'class': 'cbi-input-text',
                'value': tunnel.name,
                'placeholder': _('Tunnel name')
            });
            nameCell.appendChild(nameInput);
            
            var protoCell = E('td', { 'class': 'td' });
            var protoSelect = E('select', { 'class': 'cbi-input-select' });
            
            var option = E('option', {
                'value': tunnel.proto,
                'selected': true
            }, tunnel.proto.toUpperCase());
            protoSelect.appendChild(option);
            
            if (tunnel.proto !== 'tcp') {
                protoSelect.appendChild(E('option', {
                    'value': 'tcp'
                }, 'TCP'));
            }
            if (tunnel.proto !== 'http') {
                protoSelect.appendChild(E('option', {
                    'value': 'http'
                }, 'HTTP'));
            }
            
            protoCell.appendChild(protoSelect);
            
            var addrCell = E('td', { 'class': 'td' });
            var addrInput = E('input', {
                'type': 'text',
                'class': 'cbi-input-text',
                'value': tunnel.addr,
                'placeholder': _('80,22 or 192.168.1.1:7681')
            });
            addrCell.appendChild(addrInput);
            
            var actionCell = E('td', { 'class': 'td cbi-section-table-cell' });
            var deleteBtn = E('button', {
                'class': 'btn cbi-button cbi-button-remove',
                'type': 'button'
            });
            deleteBtn.textContent = _('Delete');
            
            deleteBtn.addEventListener('click', function() {
                var tableBody = row.parentNode;
                if (tableBody) {
                    tableBody.removeChild(row);
                    
                    var tunnels = {};
                    tableBody.querySelectorAll('tr:not(.table-titles)').forEach(function(row) {
                        var inputs = row.querySelectorAll('input, select');
                        var name = inputs[0].value;
                        if (name) {
                            tunnels[name] = {
                                proto: inputs[1].value,
                                addr: inputs[2].value
                            };
                        }
                    });
                    
                    var yaml = `version: "2"
authtoken: "${token_input.value}"
log: "/var/log/ngrok/ngrok.log"
region: "${region_select.value}"

tunnels:\n`;

                    Object.entries(tunnels).forEach(([name, tunnel]) => {
                        yaml += `  ${name}:\n`;
                        yaml += `    proto: ${tunnel.proto}\n`;
                        yaml += `    addr: ${tunnel.addr}\n`;
                    });
                    
                    fs.write('/etc/ngrok/configs/ngrok.yml', yaml)
                    .then(function() {
                        ui.addNotification(null, E('p', _('Configuration has been updated')), 'success');
                    })
                    .catch(function(e) {
                        ui.addNotification(null, E('p', _('Failed to save configuration: ' + e.message)), 'error');
                    });
                }
            });
            
            actionCell.appendChild(deleteBtn);
            
            row.appendChild(nameCell);
            row.appendChild(protoCell);
            row.appendChild(addrCell);
            row.appendChild(actionCell);
            
            return row;
        }

        tunnels.forEach(function(tunnel) {
            table.appendChild(addTunnelRow(tunnel));
        });

        tunnelSection.appendChild(table);

        var addBtn = E('button', {
            'class': 'btn cbi-button cbi-button-add',
            'click': function() {
                table.appendChild(addTunnelRow());
            }
        }, _('Add Tunnel'));
        tunnelSection.appendChild(addBtn);
        container.appendChild(tunnelSection);

        var btns = E('div', { 'class': 'cbi-page-actions' });
        var saveBtn = E('button', {
            'class': 'btn cbi-button cbi-button-apply',
            'click': function(ev) {
                var token = token_input.value;
                var region = region_select.value;
                var tunnels = {};

                table.querySelectorAll('tr:not(.table-titles)').forEach(function(row) {
                    var inputs = row.querySelectorAll('input, select');
                    var name = inputs[0].value;
                    if (name) {
                        tunnels[name] = {
                            proto: inputs[1].value,
                            addr: inputs[2].value
                        };
                    }
                });

                var yaml = `version: "2"
authtoken: "${token}"
log: "/var/log/ngrok/ngrok.log"
region: "${region}"

tunnels:\n`;

                Object.entries(tunnels).forEach(([name, tunnel]) => {
                    yaml += `  ${name}:\n`;
                    yaml += `    proto: ${tunnel.proto}\n`;
                    yaml += `    addr: ${tunnel.addr}\n`;
                });

                fs.write('/etc/ngrok/configs/ngrok.yml', yaml)
                .then(function() {
                    ui.addNotification(null, E('p', _('Configuration has been saved')), 'success');
                })
                .catch(function(e) {
                    ui.addNotification(null, E('p', _('Failed to save YAML configuration: ' + e.message)), 'error');
                });
            }
        }, _('Save & Apply'));

        btns.appendChild(saveBtn);
        container.appendChild(btns);

        return container;
    },

handleSaveApply: null,
handleSave: null,
handleReset: null
});