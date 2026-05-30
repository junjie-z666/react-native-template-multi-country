package com.multi.template

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

abstract class BaseMainActivity : ReactActivity() {

  override fun getMainComponentName(): String = BuildConfig.MAIN_COMPONENT_NAME

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName!!, fabricEnabled)
}
