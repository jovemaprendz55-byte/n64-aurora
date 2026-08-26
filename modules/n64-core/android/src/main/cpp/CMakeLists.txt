cmake_minimum_required(VERSION 3.22.1)
project(n64corebridge)

add_library(n64-core-bridge SHARED n64_runner.cpp)

target_compile_features(n64-core-bridge PRIVATE cxx_std_17)
target_link_libraries(n64-core-bridge android log dl)
