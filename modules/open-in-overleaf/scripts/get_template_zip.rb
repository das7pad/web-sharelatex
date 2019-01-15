#!/usr/bin/env ruby

require 'selenium-webdriver'

def wait_for_and_return(driver, type, selector)
  wait = Selenium::WebDriver::Wait.new(:timeout => 30)
  element = nil
  wait.until { element = driver.find_element(type, selector) }
  element
end

def get_template(template)
  FileUtils.mkdir_p("/tmp/templates/#{template}")

  profile = Selenium::WebDriver::Firefox::Profile.new
  profile['browser.download.dir'] = "/tmp/templates/#{template}"
  profile['browser.download.folderList'] = 2
  profile['browser.helperApps.neverAsk.saveToDisk'] = 'application/zip, application/octet-stream'

  driver = Selenium::WebDriver.for :firefox, profile: profile
  begin
    driver.get "https://v1.overleaf.com/docs?template=#{template}"
  
    wait_for_and_return(driver,
                        :css, 
                        "a.joyride-close-tip.wl-icon-modal-close").click
    wait_for_and_return(driver,
                        :css,
                        "span.wl-icon.wl-icon-project")
                          .find_element(:xpath, './..').click
    wait_for_and_return(driver,
                        :css,
                        "button.btn.download-zip").click

    sleep 15
    system("mv /tmp/templates/#{template}/*.zip ./#{template}.zip")
  ensure
    driver.quit
  end
rescue
  $stderr.puts "**************: Failed to download template: #{template}"
  FileUtils.rm_rf("/tmp/templates/#{template}")
end

FileUtils.rm_rf("/tmp/templates")

JSON.parse(File.read('../app/config/templates.json')).each_key do |t|
  get_template(t['name'])
end

