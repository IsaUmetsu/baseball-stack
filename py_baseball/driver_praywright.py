from playwright.sync_api import sync_playwright

class Browser:
    def __enter__(self):
        self.p = sync_playwright().start()
        self.browser = self.p.firefox.launch(headless=True)
        self.page = self.browser.new_page()
        return self.page

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.browser.close()
        self.p.stop()
