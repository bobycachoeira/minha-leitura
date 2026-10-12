/// <reference path="../../pb_data/types.d.ts" />
/** US1 — trusted device management for step-up 2FA. */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')

function body(c) {
  return http.requestBody(c) || {}
}

function readDevices(user) {
  var devices = http.jsonField(user, 'trusted_devices', [])
  return Array.isArray(devices) ? devices : []
}

function h_devices_get_api_devices(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var user = $app.findRecordById('users', userId)
  return http.ok(c, readDevices(user))
}

function h_devices_post_api_devices(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var data = body(c)
  if (!data.id) return http.fail(c, 422, 'invalid_device', 'id do dispositivo é obrigatório')
  var user = $app.findRecordById('users', userId)
  var devices = readDevices(user)
  devices.push({ id: data.id, label: data.label || 'Dispositivo', addedAt: new Date().toISOString() })
  user.set('trusted_devices', devices)
  $app.save(user)
  return http.ok(c, devices, 201)
}

function h_devices_delete_api_devices_id(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var user = $app.findRecordById('users', userId)
  var target = http.pathParam(c, 'id')
  var devices = readDevices(user).filter(function (device) {
    return device.id !== target
  })
  user.set('trusted_devices', devices)
  $app.save(user)
  return http.ok(c, devices)
}

module.exports = {
  h_devices_get_api_devices: h_devices_get_api_devices,
  h_devices_post_api_devices: h_devices_post_api_devices,
  h_devices_delete_api_devices_id: h_devices_delete_api_devices_id
}
