Rails.application.routes.draw do
  root "articles#index"

  get "/articles", to: "articles#index"

  # Defines the root path route ("/")
  # root "posts#index"
end
