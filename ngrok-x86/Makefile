## Makefile ngrok BobbyUnknown

include $(TOPDIR)/rules.mk

PKG_NAME:=ngrok
PKG_VERSION:=v3
PKG_RELEASE:=1
PKG_ARCH=amd64
PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION)-stable-linux-$(PKG_ARCH).tgz
PKG_SOURCE_URL:=https://bin.equinox.io/c/bNyj1mQVY4c
PKG_HASH:=skip

include $(INCLUDE_DIR)/package.mk

PKG_LICENSE:=MIT
PKG_MAINTAINER:=BobbyUnknown

define Package/ngrok
  SECTION:=net
  CATEGORY:=Network
  TITLE:=ngrok secure tunnels
  URL:=https://ngrok.com
  DEPENDS:=@(x86_64||amd64)
endef

define Package/ngrok/description
  ngrok is a reverse proxy that creates a secure tunnel from a public endpoint to a locally running web service.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(TAR) -xzf $(DL_DIR)/$(PKG_SOURCE) -C $(PKG_BUILD_DIR)
endef

define Build/Compile
endef

define Package/ngrok/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/ngrok $(1)/usr/bin/
	$(INSTALL_DIR) $(1)/etc/ngrok
endef

$(eval $(call BuildPackage,ngrok))
