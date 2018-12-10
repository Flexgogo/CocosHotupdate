const HallManager = {
    _storagePath: [],

    _getfiles: function(name, type, downloadCallback, finishCallback) {
        this._storagePath[name] = (jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/');
        this._downloadCallback = downloadCallback;
        this._finishCallback = finishCallback;
        this._fileName = name;

        /// 替换该地址
        var UIRLFILE = "http://192.168.58.72:8000/" + name + "/remote-assets";
        var filees = this._storagePath[name] + '/project.manifest';

        var customManifestStr = JSON.stringify({
            'packageUrl': UIRLFILE,
            'remoteManifestUrl': UIRLFILE + '/project.manifest',
            'remoteVersionUrl': UIRLFILE + '/version.manifest',
            'version': '1.0.1',
            'assets': {},
            'searchPaths': []
        });

        var versionCompareHandle = function(versionA, versionB) {
            var vA = versionA.split('.');
            var vB = versionB.split('.');
            for (var i = 0; i < vA.length; ++i) {
                var a = parseInt(vA[i]);
                var b = parseInt(vB[i] || 0);
                if (a === b) {
                    continue;
                } else {
                    return a - b;
                }
            }
            if (vB.length > vA.length) {
                return -1;
            } else {
                return 0;
            }
        };

        this._am = new jsb.AssetsManager('', this._storagePath[name], versionCompareHandle);
        this._am.setVerifyCallback(function(path, asset) {
            var compressed = asset.compressed;
            if (compressed) {
                return true;
            } else {
                return true;
            }
        });


        if (cc.sys.os === cc.sys.OS_ANDROID) {
            this._am.setMaxConcurrentTask(2);
        }

        if (type === 1) {
             this._am.setEventCallback(this._updateCb.bind(this));
        } else if (type == 2) {
             this._am.setEventCallback(this._checkCb.bind(this));
        } else {
             this._am.setEventCallback(this._needUpdate.bind(this));
        }

        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            var manifest = new jsb.Manifest(customManifestStr, this._storagePath[name]);
            this._am.loadLocalManifest(manifest, this._storagePath[name]);
        }

        if (type === 1) {
            this._am.update();
            this._failCount = 0;
        } else {
            this._am.checkUpdate();
        }
        this._updating = true;
        console.log('更新文件:' + filees);
    },

    // type = 1
    _updateCb: function(event) {
        var failed = false;
        let self = this;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                /*0 本地没有配置文件*/
                console.log('updateCb本地没有配置文件');
                failed = true;
                break;

            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                /*1下载配置文件错误*/
                console.log('updateCb下载配置文件错误');
                failed = true;
                break;

            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                /*2 解析文件错误*/
                console.log('updateCb解析文件错误');
                failed = true;
                break;

            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                /*3发现新的更新*/
                console.log('updateCb发现新的更新');
                break;

            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                /*4 已经是最新的*/
                console.log('updateCb已经是最新的');
                failed = true;
                break;

            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                /*5 最新进展 */
                self._downloadCallback && self._downloadCallback(event.getPercentByFile());
                break;


            case jsb.EventAssetsManager.ASSET_UPDATED:
                /*6需要更新*/
                break;

            case jsb.EventAssetsManager.ERROR_UPDATING:
                /*7更新错误*/
                console.log('updateCb更新错误');
                break;

            case jsb.EventAssetsManager.UPDATE_FINISHED:
                /*8更新完成*/
                self._finishCallback && self._finishCallback(true);
                break;

            case jsb.EventAssetsManager.UPDATE_FAILED:
                /*9更新失败*/
                self._failCount++;
                if (self._failCount <= 3) {
                    self._am.downloadFailedAssets();
                    console.log(('updateCb更新失败' + this._failCount + ' 次'));
                } else {
                    console.log(('updateCb失败次数过多'));
                    self._failCount = 0;
                    failed = true;
                    self._updating = false;
                }
                break;

            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                /*10解压失败*/
                console.log('updateCb解压失败');
                break;
        }

        if (failed) {
            _am.setEventCallback(null);
            self._updating = false;
            self._finishCallback && self._finishCallback(false);
        }
    },

    // type = 2
    _checkCb: function(event) {
        var failed = false;
        let self = this;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                /*0 本地没有配置文件*/
                console.log('checkCb本地没有配置文件');
                break;

            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                /*1下载配置文件错误*/
                console.log('checkCb下载配置文件错误');
                failed = true;
                break;

            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                /*2 解析文件错误*/
                console.log('checkCb解析文件错误');
                failed = true;
                break;

            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                /*3发现新的更新*/
                self._getfiles(self._fileName, 1, self._downloadCallback, self._finishCallback);
                break;

            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                /*4 已经是最新的*/
                console.log('checkCb已经是最新的');
                self._finishCallback && self._finishCallback(true);
                break;

            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                /*5 最新进展 */
                break;

            case jsb.EventAssetsManager.ASSET_UPDATED:
                /*6需要更新*/
                break;

            case jsb.EventAssetsManager.ERROR_UPDATING:
                /*7更新错误*/
                console.log('checkCb更新错误');
                failed = true;
                break;


            case jsb.EventAssetsManager.UPDATE_FINISHED:
                /*8更新完成*/
                console.log('checkCb更新完成');
                break;

            case jsb.EventAssetsManager.UPDATE_FAILED:
                /*9更新失败*/
                console.log('checkCb更新失败');
                failed = true;
                break;

            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                /*10解压失败*/
                console.log('checkCb解压失败');
                break;

        }
        this._updating = false;
        if (failed) {
            self._finishCallback && self._finishCallback(false);
        }
    },

    // type = 3
    _needUpdate: function(event) {
        let self = this;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                console.log('子游戏已经是最新的，不需要更新');
                self._finishCallback && self._finishCallback(false);
                break;

            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                console.log('子游戏需要更新');
                self._finishCallback && self._finishCallback(true);
                break;

            // 检查是否更新出错
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
            case jsb.EventAssetsManager.ERROR_UPDATING:
            case jsb.EventAssetsManager.UPDATE_FAILED:
                self._downloadCallback();
                break;
        }
    },

    /**
     * 下载子游戏
     * @param {string} name - 游戏名
     * @param progress - 下载进度回调
     * @param finish - 完成回调
     * @note finish 返回true表示下载成功，false表示下载失败
     */
    downloadGame: function(name, progress, finish) {
        this._getfiles(name, 2, progress, finish);
    },

    /**
     * 进入子游戏
     * @param {string} name - 游戏名
     */
    enterGame: function(name) {
        if (!this._storagePath[name]) {
            this.downloadGame(name);
            return;
        }
        console.log("enterGame: require " + this._storagePath[name] + '/src/main.js');
        window.require(this._storagePath[name] + '/src/main.js');
    },

    /**
     * 判断子游戏是否已经下载
     * @param {string} name - 游戏名
     */
    isGameDownLoad: function (name) {
        let file = (jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'ALLGame/' + name + '/project.manifest';
        if (jsb.fileUtils.isFileExist(file)) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * 判断子游戏是否需要更新
     * @param {string} name - 游戏名
     * @param isUpdateCallback - 是否需要更新回调
     * @param failCallback - 错误回调
     * @note isUpdateCallback 返回true表示需要更新，false表示不需要更新
     */
    needUpdateGame: function (name, isUpdateCallback, failCallback) {
        this._getfiles(name, 3, failCallback, isUpdateCallback);
    },
};

module.exports = HallManager;