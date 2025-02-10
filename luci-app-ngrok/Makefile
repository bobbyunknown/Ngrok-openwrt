include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-ngrok
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=BobbyUnknown <bobbyun.known88@gmail.com>

LUCI_TITLE:=LuCI networking tools
LUCI_DEPENDS:=+ngrok +ruby +ruby-yaml
LUCI_PKGARCH:=all

PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=LICENSE

SCRIPTS_DIR=/etc/ngrok

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=$(LUCI_TITLE)
  DEPENDS:=$(LUCI_DEPENDS)
  PKGARCH:=$(LUCI_PKGARCH)
endef

define Package/$(PKG_NAME)/description
	Luci networking tools for ngrok, Remote public access to your local network to other devices.
endef

define Build/Prepare
	# No preparation steps required
endef

define Build/Compile
	# No compilation steps required
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/* $(1)/usr/share/luci/menu.d/

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/* $(1)/usr/share/rpcd/acl.d/

	$(INSTALL_DIR) $(1)/$(SCRIPTS_DIR)
	$(INSTALL_DIR) $(1)/$(SCRIPTS_DIR)/core
	$(INSTALL_BIN) ./root/$(SCRIPTS_DIR)/core/* $(1)/$(SCRIPTS_DIR)/core/
	$(INSTALL_DIR) $(1)/$(SCRIPTS_DIR)/configs
	$(INSTALL_DATA) ./root/$(SCRIPTS_DIR)/configs/* $(1)/$(SCRIPTS_DIR)/configs/

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/ngrok $(1)/etc/init.d/ngrok

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./root/etc/config/ngrok $(1)/etc/config/ngrok

	$(INSTALL_DIR) $(1)/www/luci-static/resources/ngrok
	$(INSTALL_DATA) ./root/www/luci-static/resources/ngrok/* $(1)/www/luci-static/resources/ngrok/
	$(INSTALL_DIR) $(1)/www/luci-static/resources/tools
	$(INSTALL_DATA) ./root/www/luci-static/resources/tools/jsyaml.js $(1)/www/luci-static/resources/tools/
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] || {
    /etc/init.d/ngrok enable
    /etc/init.d/ngrok start
    sleep 5
	/etc/init.d/ngrok stop
	/etc/init.d/ngrok disable
}
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] || {
	/etc/init.d/ngrok stop
	/etc/init.d/ngrok disable
	echo "Ngrok uninstalled"
	echo "Thank for using this app"
}
endef

$(eval $(call BuildPackage,$(PKG_NAME)))